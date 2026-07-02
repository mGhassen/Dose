/**
 * Square sync import: catalog → items, orders → sales/entries, payments → payments.
 * Uses integration_entity_mapping to only add data that is missing in the app.
 */

type SupabaseClient = { from: (table: string) => any };

const RUNNING_JOB_STATUSES = ['staging', 'pending', 'processing'] as const;
const CHUNK = 500;

export async function getMappedAppEntityId(
  supabase: SupabaseClient,
  integrationId: number,
  sourceType: string,
  sourceId: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('integration_entity_mapping')
    .select('app_entity_id')
    .eq('integration_id', integrationId)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .maybeSingle();
  if (error || !data) return null;
  return data.app_entity_id as number;
}

export type MappingKey = `${string}:${string}`;

export function makeMappingKey(sourceType: string, sourceId: string): MappingKey {
  return `${sourceType}:${sourceId}` as MappingKey;
}

/**
 * Batch-load integration_entity_mapping rows for many (source_type, source_id)
 * pairs at once and return a Map keyed by `${source_type}:${source_id}`.
 */
export async function getMappedAppEntityIdsBatch(
  supabase: SupabaseClient,
  integrationId: number,
  sourceTypes: string[],
  sourceIds: string[]
): Promise<Map<MappingKey, number>> {
  const out = new Map<MappingKey, number>();
  if (sourceTypes.length === 0 || sourceIds.length === 0) return out;
  const unique = Array.from(new Set(sourceIds.filter(Boolean)));
  for (let i = 0; i < unique.length; i += CHUNK) {
    const slice = unique.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('integration_entity_mapping')
      .select('source_type, source_id, app_entity_id')
      .eq('integration_id', integrationId)
      .in('source_type', sourceTypes)
      .in('source_id', slice);
    if (error || !data) continue;
    for (const row of data as { source_type: string; source_id: string; app_entity_id: number }[]) {
      out.set(makeMappingKey(row.source_type, row.source_id), row.app_entity_id);
    }
  }
  return out;
}

/** Source IDs that already have any mapping row for this integration. */
export async function getMappedSourceIdsBatch(
  supabase: SupabaseClient,
  integrationId: number,
  sourceTypes: string[],
  sourceIds: string[]
): Promise<Set<string>> {
  const out = new Set<string>();
  if (sourceTypes.length === 0 || sourceIds.length === 0) return out;
  const unique = Array.from(new Set(sourceIds.filter(Boolean)));
  for (let i = 0; i < unique.length; i += CHUNK) {
    const slice = unique.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('integration_entity_mapping')
      .select('source_id')
      .eq('integration_id', integrationId)
      .in('source_type', sourceTypes)
      .in('source_id', slice);
    if (error || !data) continue;
    for (const row of data as { source_id: string }[]) {
      if (row.source_id) out.add(row.source_id);
    }
  }
  return out;
}

/** Source IDs already staged and processed on any job for this integration. */
export async function getProcessedStagingSourceIdsBatch(
  supabase: SupabaseClient,
  integrationId: number,
  dataType: string,
  sourceIds: string[]
): Promise<Set<string>> {
  const out = new Set<string>();
  const unique = Array.from(new Set(sourceIds.filter(Boolean)));
  if (unique.length === 0) return out;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const slice = unique.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('sync_square_data')
      .select('source_id')
      .eq('integration_id', integrationId)
      .eq('data_type', dataType)
      .in('source_id', slice)
      .not('processed_at', 'is', null);
    if (error || !data) continue;
    for (const row of data as { source_id: string }[]) {
      if (row.source_id) out.add(row.source_id);
    }
  }
  return out;
}

/** Source IDs staged unprocessed on another active job for this integration. */
export async function getActiveStagingSourceIdsBatch(
  supabase: SupabaseClient,
  integrationId: number,
  stagingJobId: number,
  dataType: string,
  sourceIds: string[]
): Promise<Set<string>> {
  const out = new Set<string>();
  const unique = Array.from(new Set(sourceIds.filter(Boolean)));
  if (unique.length === 0) return out;

  const { data: activeJobs } = await supabase
    .from('sync_jobs')
    .select('id')
    .eq('integration_id', integrationId)
    .in('status', [...RUNNING_JOB_STATUSES]);
  const activeJobIds = (activeJobs ?? [])
    .map((j: { id: number }) => j.id as number)
    .filter((id: number) => id !== stagingJobId);
  if (activeJobIds.length === 0) return out;

  for (let i = 0; i < unique.length; i += CHUNK) {
    const slice = unique.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('sync_square_data')
      .select('source_id')
      .eq('integration_id', integrationId)
      .eq('data_type', dataType)
      .in('source_id', slice)
      .in('job_id', activeJobIds)
      .is('processed_at', null);
    if (error || !data) continue;
    for (const row of data as { source_id: string }[]) {
      if (row.source_id) out.add(row.source_id);
    }
  }
  return out;
}

export async function insertMapping(
  supabase: SupabaseClient,
  integrationId: number,
  sourceType: string,
  sourceId: string,
  appEntityType: string,
  appEntityId: number
): Promise<number> {
  const { data, error } = await supabase
    .from('integration_entity_mapping')
    .upsert(
      {
        integration_id: integrationId,
        source_type: sourceType,
        source_id: sourceId,
        app_entity_type: appEntityType,
        app_entity_id: appEntityId,
      },
      { onConflict: 'integration_id,source_type,source_id' }
    )
    .select('app_entity_id')
    .maybeSingle();
  if (error) throw error;
  if (data?.app_entity_id != null) return data.app_entity_id as number;

  const existing = await getMappedAppEntityId(supabase, integrationId, sourceType, sourceId);
  if (existing != null) return existing;
  return appEntityId;
}

export function centsToDecimal(cents: number): number {
  return Math.round(cents) / 100;
}
