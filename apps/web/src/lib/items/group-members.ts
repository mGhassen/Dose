import type { supabaseServer } from '@kit/lib/supabase';

type Supa = ReturnType<typeof supabaseServer>;

/**
 * Resolve the set of item ids that should be aggregated together for analytics/detail views.
 *
 * - Ungrouped item -> `[itemId]`
 * - Canonical item of a group -> all member ids in the group
 * - Non-canonical member -> `[itemId]` (we don't auto-aggregate when user is looking at a duplicate)
 */
export async function getGroupMemberIds(
  supabase: Supa,
  itemId: number
): Promise<number[]> {
  const { data: item, error: itemErr } = await supabase
    .from('items')
    .select('id, group_id')
    .eq('id', itemId)
    .maybeSingle();
  if (itemErr) throw itemErr;
  if (!item || !item.group_id) return [itemId];

  const { data: group, error: groupErr } = await supabase
    .from('item_groups')
    .select('canonical_item_id')
    .eq('id', item.group_id)
    .maybeSingle();
  if (groupErr) throw groupErr;
  if (!group || group.canonical_item_id !== itemId) return [itemId];

  const { data: members, error: membersErr } = await supabase
    .from('items')
    .select('id')
    .eq('group_id', item.group_id);
  if (membersErr) throw membersErr;

  const ids = (members || []).map((m: any) => m.id);
  return ids.length > 0 ? ids : [itemId];
}

/** For pricing/cost resolution, history and supplier data are keyed on the merged group's canonical item. */
export async function resolveCanonicalItemIdForCost(supabase: Supa, itemId: number): Promise<number> {
  const { data } = await supabase
    .from('items')
    .select('group_id')
    .eq('id', itemId)
    .maybeSingle();
  if (!data?.group_id) return itemId;
  const { data: group } = await supabase
    .from('item_groups')
    .select('canonical_item_id')
    .eq('id', data.group_id)
    .maybeSingle();
  return group?.canonical_item_id ?? itemId;
}
