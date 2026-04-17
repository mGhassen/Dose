/**
 * Square Catalog TAX → Dose `variables` (transaction_tax) + `integration_entity_mapping` (catalog_tax).
 */

import { getMappedAppEntityId, insertMapping } from './square-import';

type SupabaseClient = { from: (table: string) => any };

/** Square Catalog API: TAX object uses tax_data.percentage as string (e.g. "10.0"). */
export function parseSquareTaxRatePercent(taxObj: { tax_data?: { percentage?: string } } | null): number | null {
  const raw = taxObj?.tax_data?.percentage;
  if (raw == null || raw === '') return null;
  const n = parseFloat(String(raw));
  return Number.isFinite(n) ? Math.round(n * 10000) / 10000 : null;
}

export function squareTaxDisplayName(taxObj: { tax_data?: { name?: string } } | null, squareTaxId: string): string {
  const n = taxObj?.tax_data?.name?.trim();
  return n || `Square tax ${squareTaxId.slice(0, 8)}`;
}

const ALL_SALES_TYPE_CONDITION_VALUES = ['on_site', 'delivery', 'takeaway', 'catering', 'other'] as const;

/**
 * Ensure integration_entity_mapping (catalog_tax → variable) exists; create a matching transaction_tax variable if needed.
 */
export async function ensureCatalogTaxVariableMapping(
  supabase: SupabaseClient,
  integrationId: number,
  squareTaxId: string,
  taxObj: any,
  todayDate: string
): Promise<number | null> {
  const existing = await getMappedAppEntityId(supabase, integrationId, 'catalog_tax', squareTaxId);
  if (existing != null) return existing;

  const rate = parseSquareTaxRatePercent(taxObj);
  if (rate == null) return null;

  const { data: matchByRate } = await supabase
    .from('variables')
    .select('id')
    .eq('type', 'transaction_tax')
    .eq('is_active', true)
    .eq('value', rate)
    .limit(1)
    .maybeSingle();

  let variableId: number | null = matchByRate?.id ?? null;

  if (variableId == null) {
    const label = squareTaxDisplayName(taxObj, squareTaxId);
    const { data: inserted, error: insErr } = await supabase
      .from('variables')
      .insert({
        name: `${label} (${rate}%)`,
        type: 'transaction_tax',
        value: rate,
        effective_date: todayDate,
        is_active: true,
        payload: {
          source: 'square_catalog_tax',
          squareCatalogTaxId: squareTaxId,
        },
      })
      .select('id')
      .single();
    if (insErr || !inserted?.id) return null;
    variableId = inserted.id as number;
  }

  await insertMapping(supabase, integrationId, 'catalog_tax', squareTaxId, 'variable', variableId);
  return variableId;
}

/**
 * Upsert `item_taxes` rows for a sellable item from Square item_data.tax_ids.
 */
export async function upsertItemTaxesFromSquareTaxIds(
  supabase: SupabaseClient,
  integrationId: number,
  itemId: number,
  squareTaxIds: string[],
  taxInclusionByTaxId: Map<string, 'ADDITIVE' | 'INCLUSIVE'>
): Promise<void> {
  if (!squareTaxIds.length) return;

  const conditionValues = [...ALL_SALES_TYPE_CONDITION_VALUES];

  for (const tid of squareTaxIds) {
    const variableId = await getMappedAppEntityId(supabase, integrationId, 'catalog_tax', tid);
    if (variableId == null) continue;

    const inc = taxInclusionByTaxId.get(tid);
    const calculationType = inc === 'INCLUSIVE' ? 'inclusive' : 'additive';

    const { data: existing } = await supabase
      .from('item_taxes')
      .select('id')
      .eq('item_id', itemId)
      .eq('condition_type', 'sales_type')
      .eq('variable_id', variableId)
      .maybeSingle();

    const row = {
      item_id: itemId,
      variable_id: variableId,
      condition_type: 'sales_type',
      condition_values: conditionValues,
      calculation_type: calculationType,
      priority: 0,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await supabase.from('item_taxes').update(row).eq('id', existing.id);
    } else {
      await supabase.from('item_taxes').insert(row);
    }
  }
}
