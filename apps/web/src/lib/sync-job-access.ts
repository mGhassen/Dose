import type { SupabaseClient } from "@supabase/supabase-js";

export type SyncJobAccessResult =
  | {
      ok: true;
      job: Record<string, unknown>;
      integration: { id: number; account_id: string; integration_type: string };
    }
  | { ok: false; status: number; message: string };

export async function getSyncJobWithIntegrationForUser(
  supabase: SupabaseClient,
  jobId: string,
  accessToken: string | null
): Promise<SyncJobAccessResult> {
  if (!accessToken) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser(accessToken);
  if (!user) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }
  const { data: account } = await supabase.from("accounts").select("id").eq("auth_user_id", user.id).single();
  if (!account) {
    return { ok: false, status: 404, message: "Account not found" };
  }
  const { data: job, error } = await supabase.from("sync_jobs").select("*").eq("id", jobId).single();
  if (error || !job) {
    return { ok: false, status: 404, message: "Job not found" };
  }
  const { data: integration } = await supabase
    .from("integrations")
    .select("id, account_id, integration_type")
    .eq("id", job.integration_id as number)
    .single();
  if (!integration || integration.account_id !== account.id) {
    return { ok: false, status: 404, message: "Job not found" };
  }
  return { ok: true, job, integration };
}
