import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@kit/lib/supabase";
import { getSyncJobWithIntegrationForUser } from "@/lib/sync-job-access";
import { BULK_IMPORT_ENTITY_NAMES, type BulkImportEntity } from "@/lib/bulk-import/constants";
import { buildBulkResolutionHints } from "@/lib/bulk-import/bulk-import-resolution-hints";
import { BULK_IMPORT_COLUMNS } from "@/lib/bulk-import/templates";

function isBulkEntity(e: string): e is BulkImportEntity {
  return (BULK_IMPORT_ENTITY_NAMES as readonly string[]).includes(e);
}

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 200;

export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    const supabase = supabaseServer();
    const access = await getSyncJobWithIntegrationForUser(supabase, jobId, token);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status });
    }
    if (access.integration.integration_type !== "csv_bulk") {
      return NextResponse.json({ error: "Not a bulk import job" }, { status: 400 });
    }

    const { count: total, error: countErr } = await supabase
      .from("sync_pennylane_data")
      .select("*", { count: "exact", head: true })
      .eq("job_id", jobId);
    if (countErr) {
      return NextResponse.json({ error: countErr.message }, { status: 500 });
    }

    const sp = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(Number(sp.get("limit")) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = Math.max(Number(sp.get("offset")) || 0, 0);

    const { data: rows, error: rowsErr } = await supabase
      .from("sync_pennylane_data")
      .select("data_type, source_id, payload")
      .eq("job_id", jobId)
      .order("source_id", { ascending: true })
      .range(offset, offset + limit - 1);

    if (rowsErr) {
      return NextResponse.json({ error: rowsErr.message }, { status: 500 });
    }

    const job = access.job;
    const entity = job.sync_type as string;
    const templateColumns =
      entity in BULK_IMPORT_COLUMNS ? BULK_IMPORT_COLUMNS[entity as BulkImportEntity] : [];

    let resolution_hints = null;
    if (isBulkEntity(entity)) {
      const { data: hintRows, error: hintErr } = await supabase
        .from("sync_pennylane_data")
        .select("data_type, payload")
        .eq("job_id", jobId)
        .limit(8000);
      if (!hintErr) {
        const payloads = (hintRows ?? [])
          .filter(
            (r: { data_type: string }) =>
              r.data_type === "bulk_row" || r.data_type === "bulk_semantic_row"
          )
          .map((r: { payload: unknown }) => (r.payload || {}) as Record<string, unknown>);
        resolution_hints = await buildBulkResolutionHints(supabase, entity, payloads);
      }
    }

    return NextResponse.json({
      job: {
        id: job.id,
        integration_id: job.integration_id,
        sync_type: job.sync_type,
        status: job.status,
        bulk_review_status: job.bulk_review_status ?? "none",
        bulk_review_payload: job.bulk_review_payload ?? {},
        stats: job.stats ?? {},
        source_file_path: job.source_file_path ?? null,
        error_message: job.error_message ?? null,
        created_at: job.created_at,
      },
      entity,
      rows_staged: total ?? 0,
      rows: rows ?? [],
      pagination: { limit, offset, total: total ?? 0 },
      template_columns: templateColumns,
      resolution_hints,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load preview";
    console.error("bulk-preview:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
