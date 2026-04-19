import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@kit/lib/supabase";
import { getSyncJobWithIntegrationForUser } from "@/lib/sync-job-access";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
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
      return NextResponse.json({ error: "Import is processing" }, { status: 409 });
    }
    if (bulkReviewStatus !== "needs_review" && bulkReviewStatus !== "ready") {
      return NextResponse.json(
        { error: "Review payload can only be edited while the job awaits review or is ready to apply." },
        { status: 400 }
      );
    }

    let payload: Record<string, unknown> = {};
    try {
      const body = await request.json();
      if (body && typeof body === "object" && body.bulk_review_payload != null) {
        payload = body.bulk_review_payload as Record<string, unknown>;
      } else if (body && typeof body === "object") {
        payload = body as Record<string, unknown>;
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { error: updateErr } = await supabase
      .from("sync_jobs")
      .update({ bulk_review_payload: payload })
      .eq("id", jobId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ job_id: Number(jobId), bulk_review_payload: payload });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to save review";
    console.error("bulk-review:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
