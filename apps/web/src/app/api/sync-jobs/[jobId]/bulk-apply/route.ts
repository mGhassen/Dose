import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@kit/lib/supabase";
import { getSyncJobWithIntegrationForUser } from "@/lib/sync-job-access";

export async function POST(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
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

    const job = access.job;
    const status = job.status as string;
    const bulkReviewStatus = job.bulk_review_status as string | undefined;
    if (bulkReviewStatus === "complete" || status === "completed") {
      return NextResponse.json({ error: "Import already completed" }, { status: 400 });
    }
    if (status === "processing") {
      return NextResponse.json({ error: "Import is already processing" }, { status: 409 });
    }
    const canApply =
      (bulkReviewStatus === "needs_review" && status === "pending") ||
      (bulkReviewStatus === "ready" && (status === "failed" || status === "pending"));
    if (!canApply) {
      return NextResponse.json(
        { error: "Job is not in a state that can be applied (wrong status or review step)." },
        { status: 400 }
      );
    }

    let payload: Record<string, unknown> | undefined;
    try {
      const body = await request.json();
      if (body && typeof body === "object") {
        if ("bulk_review_payload" in body) {
          payload = (body.bulk_review_payload ?? {}) as Record<string, unknown>;
        } else if (Object.keys(body).length > 0) {
          payload = body as Record<string, unknown>;
        }
      }
    } catch {
      payload = undefined;
    }

    await supabase.from("sync_import_errors").delete().eq("job_id", jobId);

    const patch: Record<string, unknown> = {
      bulk_review_status: "ready",
      status: "pending",
      started_at: null,
      completed_at: null,
      error_message: null,
    };
    if (payload !== undefined) {
      patch.bulk_review_payload = payload;
    }

    const { error: updateErr } = await supabase.from("sync_jobs").update(patch).eq("id", jobId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    const origin = request.nextUrl.origin;
    const secret = process.env.CRON_SECRET;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) headers["x-cron-secret"] = secret;
    fetch(`${origin}/api/cron/process-sync-jobs?job_id=${jobId}`, { method: "POST", headers }).catch(() => {});

    return NextResponse.json({ job_id: Number(jobId), message: "Bulk apply queued." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to apply bulk import";
    console.error("bulk-apply:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
