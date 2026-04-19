import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@kit/lib/supabase";
import { bulkImportEntitySchema } from "@/shared/zod-schemas";
import { parseBulkImportFile } from "@/lib/bulk-import/parse-bulk-file";
import type { BulkImportEntity } from "@/lib/bulk-import/constants";

const STORAGE_BUCKET = "bulk-imports";

async function getAccountAndIntegrationOrThrow(supabase: ReturnType<typeof supabaseServer>, integrationId: string, token: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  const { data: account } = await supabase.from("accounts").select("id").eq("auth_user_id", user.id).single();
  if (!account) {
    throw Object.assign(new Error("Account not found"), { status: 404 });
  }

  const { data: integration, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("id", integrationId)
    .eq("account_id", account.id)
    .single();
  if (error || !integration) {
    throw Object.assign(new Error("Integration not found"), { status: 404 });
  }
  if (integration.integration_type !== "csv_bulk") {
    throw Object.assign(new Error("Integration type must be csv_bulk"), { status: 400 });
  }
  if (integration.status !== "connected") {
    throw Object.assign(new Error("Integration is not connected"), { status: 400 });
  }
  return { account, integration };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 });
    }
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const supabase = supabaseServer();
    const { account, integration } = await getAccountAndIntegrationOrThrow(supabase, id, token);

    const form = await request.formData();
    const file = form.get("file");
    const entityRaw = form.get("entity");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file field "file"' }, { status: 400 });
    }
    const entityParsed = bulkImportEntitySchema.safeParse(typeof entityRaw === "string" ? entityRaw : "");
    if (!entityParsed.success) {
      return NextResponse.json({ error: "Invalid or missing entity" }, { status: 400 });
    }
    const entity = entityParsed.data as BulkImportEntity;

    const { data: jobRow, error: jobErr } = await supabase
      .from("sync_jobs")
      .insert({
        integration_id: integration.id,
        sync_type: entity,
        status: "pending",
        stats: {},
      })
      .select("id")
      .single();
    if (jobErr) {
      return NextResponse.json({ error: "Failed to create sync job", details: jobErr.message }, { status: 500 });
    }
    const jobId = jobRow.id as number;

    const originalName = file.name || `bulk-import-${jobId}`;
    const storagePath = `${account.id}/${jobId}/${originalName}`;

    const ab = await file.arrayBuffer();
    const uploadRes = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, ab, {
      contentType:
        file.type ||
        (originalName.toLowerCase().endsWith(".xlsx")
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv"),
      upsert: false,
    });
    if (uploadRes.error) {
      await supabase
        .from("sync_jobs")
        .update({
          status: "failed",
          error_message: uploadRes.error.message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      return NextResponse.json({ job_id: jobId, status: "failed", error_message: uploadRes.error.message }, { status: 200 });
    }

    let staged: ReturnType<typeof parseBulkImportFile>;
    try {
      staged = parseBulkImportFile(entity, ab, originalName, file.type);
    } catch (e: any) {
      await supabase
        .from("sync_jobs")
        .update({
          status: "failed",
          error_message: e?.message || "Failed to parse file",
          completed_at: new Date().toISOString(),
          source_file_path: storagePath,
        })
        .eq("id", jobId);
      return NextResponse.json({ job_id: jobId, status: "failed", error_message: e?.message || "Parse error" }, { status: 200 });
    }

    if (staged.length === 0) {
      await supabase
        .from("sync_jobs")
        .update({
          status: "failed",
          error_message: "No rows parsed from file",
          completed_at: new Date().toISOString(),
          stats: { import_file_path: storagePath, rows_staged: 0 },
          source_file_path: storagePath,
        })
        .eq("id", jobId);
      return NextResponse.json({ job_id: jobId, status: "failed", error_message: "No rows parsed from file" }, { status: 200 });
    }

    const rows = staged.map((r) => ({
      job_id: jobId,
      data_type: "bulk_row",
      source_id: r.source_id,
      payload: r.payload,
    }));

    const batchSize = 1000;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error: insertErr } = await supabase.from("sync_pennylane_data").insert(batch);
      if (insertErr) {
        await supabase
          .from("sync_jobs")
          .update({
            status: "failed",
            error_message: insertErr.message,
            completed_at: new Date().toISOString(),
            stats: { import_file_path: storagePath, rows_staged: i },
            source_file_path: storagePath,
          })
          .eq("id", jobId);
        return NextResponse.json({ job_id: jobId, status: "failed", error_message: insertErr.message }, { status: 200 });
      }
    }

    await supabase
      .from("sync_jobs")
      .update({
        stats: {
          import_file_path: storagePath,
          original_filename: originalName,
          entity,
          rows_staged: rows.length,
        },
        source_file_path: storagePath,
      })
      .eq("id", jobId);

    await supabase
      .from("integrations")
      .update({ last_sync_status: "in_progress", last_sync_error: null })
      .eq("id", integration.id);

    const origin = request.nextUrl.origin;
    const secret = process.env.CRON_SECRET;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) headers["x-cron-secret"] = secret;
    fetch(`${origin}/api/cron/process-sync-jobs?job_id=${jobId}`, { method: "POST", headers }).catch(() => {});

    return NextResponse.json({ job_id: jobId, message: "Import started. Processing in background." }, { status: 202 });
  } catch (e: any) {
    const status = typeof e?.status === "number" ? e.status : 500;
    return NextResponse.json({ error: e?.message || "Failed to import bulk file" }, { status });
  }
}
