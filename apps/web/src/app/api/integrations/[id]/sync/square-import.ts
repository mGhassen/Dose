/**
 * Square sync import: catalog → items, orders → sales/entries, payments → payments.
 * Uses integration_entity_mapping to only add data that is missing in the app.
 */

type SupabaseClient = { from: (table: string) => any };

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
 * Queries in pages to stay under PostgREST `in(...)` limits.
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
  const CHUNK = 500;
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

export async function insertMapping(
  supabase: SupabaseClient,
  integrationId: number,
  sourceType: string,
  sourceId: string,
  appEntityType: string,
  appEntityId: number
): Promise<void> {
  const { error } = await supabase.from('integration_entity_mapping').insert({
    integration_id: integrationId,
    source_type: sourceType,
    source_id: sourceId,
    app_entity_type: appEntityType,
    app_entity_id: appEntityId,
  });
  if (error) throw error;
}

export function centsToDecimal(cents: number): number {
  return Math.round(cents) / 100;
}
