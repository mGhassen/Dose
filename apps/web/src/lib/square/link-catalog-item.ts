import {
  centsToDecimal,
  getMappedAppEntityId,
  insertMapping,
} from '@/app/api/integrations/[id]/sync/square-import';
import { getDefaultUnitVariableId } from '@/app/api/integrations/[id]/sync/square-measurement-unit';
import { upsertSellingPrice } from '@/lib/items/price-history-upsert';

type SupabaseClient = { from: (table: string) => any };

const SQUARE_USE_SANDBOX = process.env.SQUARE_USE_SANDBOX === 'true';
const SQUARE_API_BASE = SQUARE_USE_SANDBOX
  ? 'https://connect.squareupsandbox.com'
  : 'https://connect.squareup.com';

export type SquareLinkSourceType = 'catalog_variation' | 'catalog_item';

async function squareBatchRetrieve(
  accessToken: string,
  objectIds: string[]
): Promise<{ objects: any[]; relatedObjects: any[] }> {
  const res = await fetch(`${SQUARE_API_BASE}/v2/catalog/batch-retrieve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': '2024-01-18',
    },
    body: JSON.stringify({
      object_ids: objectIds,
      include_deleted_objects: true,
      include_related_objects: true,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Square batch-retrieve failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { objects?: any[]; related_objects?: any[] };
  return {
    objects: data.objects ?? [],
    relatedObjects: data.related_objects ?? [],
  };
}

function findObject(objects: any[], id: string, type?: string): any | null {
  return (
    objects.find((o) => o?.id === id && (type == null || o?.type === type)) ?? null
  );
}

async function ensureParentForVariation(
  supabase: SupabaseClient,
  integrationId: number,
  squareItemId: string,
  relatedObjects: any[],
  defaultUnitVariableId: number | null
): Promise<number | null> {
  let parentItemId = await getMappedAppEntityId(
    supabase,
    integrationId,
    'catalog_item_parent',
    squareItemId
  );
  if (parentItemId != null) return parentItemId;

  const itemObj = findObject(relatedObjects, squareItemId, 'ITEM');
  const itemData = itemObj?.item_data ?? {};
  const rawItemName = itemData.name || 'Unnamed';
  const itemName = itemObj?.is_deleted ? `[archived] ${rawItemName}` : rawItemName;
  const itemDesc = itemData.description || null;

  const { data: parentRow, error: parentErr } = await supabase
    .from('items')
    .insert({
      name: itemName,
      description: itemDesc,
      category_id: null,
      unit_id: defaultUnitVariableId,
      item_types: ['product'],
      is_active: !itemObj?.is_deleted,
      is_catalog_parent: true,
    })
    .select('id')
    .single();
  if (parentErr || !parentRow) return null;

  parentItemId = parentRow.id as number;
  await insertMapping(
    supabase,
    integrationId,
    'catalog_item_parent',
    squareItemId,
    'item',
    parentItemId
  );
  return parentItemId;
}

export async function linkItemToSquareCatalog(
  supabase: SupabaseClient,
  integrationId: number,
  itemId: number,
  sourceType: SquareLinkSourceType,
  sourceId: string,
  accessToken: string
): Promise<void> {
  const { data: itemRow, error: itemErr } = await supabase
    .from('items')
    .select('id, is_catalog_parent')
    .eq('id', itemId)
    .maybeSingle();
  if (itemErr) throw itemErr;
  if (!itemRow) throw new Error('Item not found');
  if (itemRow.is_catalog_parent) {
    throw new Error('Cannot link a catalog parent row — link a sellable SKU instead');
  }

  const { data: existingMap } = await supabase
    .from('integration_entity_mapping')
    .select('app_entity_id')
    .eq('integration_id', integrationId)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .maybeSingle();
  if (existingMap && existingMap.app_entity_id !== itemId) {
    const err = new Error(
      `Square catalog object is already linked to item #${existingMap.app_entity_id}`
    ) as Error & { status?: number };
    err.status = 409;
    throw err;
  }

  const { objects, relatedObjects } = await squareBatchRetrieve(accessToken, [sourceId]);
  const allObjects = [...objects, ...relatedObjects];
  const catalogObj = findObject(allObjects, sourceId);
  if (!catalogObj) {
    throw new Error('Square catalog object not found');
  }

  const expectedType = sourceType === 'catalog_variation' ? 'ITEM_VARIATION' : 'ITEM';
  if (catalogObj.type !== expectedType) {
    throw new Error(`Expected Square type ${expectedType}, got ${catalogObj.type ?? 'unknown'}`);
  }

  const today = new Date().toISOString().split('T')[0];
  const defaultUnitVariableId = await getDefaultUnitVariableId(supabase);

  if (sourceType === 'catalog_item') {
    const itemData = catalogObj.item_data ?? {};
    const rawName = itemData.name || 'Unnamed';
    const name = catalogObj.is_deleted ? `[archived] ${rawName}` : rawName;
    const description = itemData.description || null;

    await supabase
      .from('items')
      .update({
        name,
        description,
        is_active: !catalogObj.is_deleted,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    await insertMapping(supabase, integrationId, 'catalog_item', sourceId, 'item', itemId);

    const variations = itemData.variations as string[] | undefined;
    if (Array.isArray(variations)) {
      for (const vid of variations) {
        const vo = findObject(allObjects, vid, 'ITEM_VARIATION');
        const cents = vo?.item_variation_data?.price_money?.amount;
        if (typeof cents === 'number' && cents >= 0) {
          await upsertSellingPrice(supabase, itemId, today, centsToDecimal(cents), undefined);
          break;
        }
      }
    }
    return;
  }

  const vData = catalogObj.item_variation_data ?? {};
  const squareItemId = vData.item_id as string | undefined;
  const parentObj = squareItemId ? findObject(allObjects, squareItemId, 'ITEM') : null;
  const parentData = parentObj?.item_data ?? {};
  const rawItemName = parentData.name || 'Unnamed';
  const rawDisplayName =
    parentObj &&
    Array.isArray(parentData.variations) &&
    parentData.variations.length > 1
      ? `${rawItemName} - ${vData.name || sourceId}`
      : rawItemName;
  const archived = !!catalogObj.is_deleted || !!parentObj?.is_deleted;
  const name = archived ? `[archived] ${rawDisplayName}` : rawDisplayName;
  const description = parentData.description || null;
  const sku = vData.sku || null;
  const priceCents = vData.price_money?.amount;

  await supabase
    .from('items')
    .update({
      name,
      description,
      sku,
      is_active: !archived,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  await insertMapping(supabase, integrationId, 'catalog_variation', sourceId, 'item', itemId);

  if (typeof priceCents === 'number' && priceCents >= 0) {
    await upsertSellingPrice(supabase, itemId, today, centsToDecimal(priceCents), undefined);
  }

  if (squareItemId) {
    const parentItemId = await ensureParentForVariation(
      supabase,
      integrationId,
      squareItemId,
      allObjects,
      defaultUnitVariableId
    );
    if (parentItemId != null) {
      const { data: ivRow } = await supabase
        .from('item_variations')
        .select('id')
        .eq('variant_item_id', itemId)
        .maybeSingle();
      if (!ivRow) {
        await supabase.from('item_variations').insert({
          parent_item_id: parentItemId,
          variant_item_id: itemId,
          square_variation_id: sourceId,
          sort_order: vData.ordinal ?? 0,
          name_snapshot: vData.name || null,
        });
      } else {
        await supabase
          .from('item_variations')
          .update({
            parent_item_id: parentItemId,
            square_variation_id: sourceId,
            name_snapshot: vData.name || null,
          })
          .eq('id', ivRow.id);
      }
    }
  }
}
