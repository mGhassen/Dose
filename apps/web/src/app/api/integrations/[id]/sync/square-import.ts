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
