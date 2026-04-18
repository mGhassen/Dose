import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';

/**
 * Square catalog context: parent/variant links and modifier lists for an item.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
    }

    const supabase = supabaseServer();

    let parentItem: { id: number; name: string; isCatalogParent: boolean } | null = null;
    let variantMeta: { nameSnapshot: string | null; squareVariationId: string | null } | null = null;

    const { data: asVariant } = await supabase
      .from('item_variations')
      .select('parent_item_id, name_snapshot, square_variation_id')
      .eq('variant_item_id', itemId)
      .maybeSingle();

    if (asVariant?.parent_item_id) {
      const { data: parent } = await supabase
        .from('items')
        .select('id, name, is_catalog_parent')
        .eq('id', asVariant.parent_item_id)
        .maybeSingle();
      if (parent) {
        parentItem = {
          id: parent.id as number,
          name: parent.name as string,
          isCatalogParent: !!(parent as { is_catalog_parent?: boolean }).is_catalog_parent,
        };
      }
      variantMeta = {
        nameSnapshot: (asVariant.name_snapshot as string) ?? null,
        squareVariationId: (asVariant.square_variation_id as string) ?? null,
      };
    }

    const { data: variationRows } = await supabase
      .from('item_variations')
      .select('id, variant_item_id, sort_order, name_snapshot, square_variation_id')
      .eq('parent_item_id', itemId)
      .order('sort_order', { ascending: true });

    const variations: {
      id: number;
      variantItemId: number;
      name: string;
      sku: string | null;
      sortOrder: number | null;
      nameSnapshot: string | null;
      squareVariationId: string | null;
    }[] = [];

    for (const row of variationRows || []) {
      const vid = row.variant_item_id as number;
      const { data: vi } = await supabase
        .from('items')
        .select('name, sku')
        .eq('id', vid)
        .maybeSingle();
      variations.push({
        id: row.id as number,
        variantItemId: vid,
        name: (vi?.name as string) ?? '—',
        sku: (vi?.sku as string) ?? null,
        sortOrder: (row.sort_order as number) ?? null,
        nameSnapshot: (row.name_snapshot as string) ?? null,
        squareVariationId: (row.square_variation_id as string) ?? null,
      });
    }

    let modifierSourceItemId = itemId;
    if (asVariant?.parent_item_id) {
      modifierSourceItemId = asVariant.parent_item_id as number;
    }

    const { data: linkRows } = await supabase
      .from('item_modifier_list_links')
      .select('sort_order, min_selected, max_selected, enabled, modifier_list_id')
      .eq('item_id', modifierSourceItemId)
      .order('sort_order', { ascending: true });

    const modifierLists: {
      linkSortOrder: number | null;
      minSelected: number | null;
      maxSelected: number | null;
      enabled: boolean;
      id: number;
      name: string | null;
      selectionType: string | null;
      squareModifierListId: string | null;
      modifiers: {
        id: number;
        name: string | null;
        priceAmountCents: number | null;
        sortOrder: number;
        squareModifierId: string | null;
        supplyItemId: number | null;
        supplyItemName: string | null;
        supplyItemAffectsStock: boolean;
      }[];
    }[] = [];

    for (const lr of linkRows || []) {
      const listId = lr.modifier_list_id as number | undefined;
      if (!listId) continue;
      const { data: listRow } = await supabase
        .from('modifier_lists')
        .select('id, name, selection_type, square_modifier_list_id')
        .eq('id', listId)
        .maybeSingle();
      if (!listRow) continue;

      const { data: mods } = await supabase
        .from('modifiers')
        .select('id, name, price_amount_cents, sort_order, square_modifier_id, item_id')
        .eq('modifier_list_id', listId)
        .order('sort_order', { ascending: true });

      const modifiers = [];
      for (const m of mods || []) {
        let supplyItemName: string | null = null;
        let supplyItemAffectsStock: boolean = true;
        const mid = m.item_id as number | null;
        if (mid) {
          const { data: inv } = await supabase
            .from('items')
            .select('name, affects_stock')
            .eq('id', mid)
            .maybeSingle();
          supplyItemName = (inv?.name as string) ?? null;
          supplyItemAffectsStock = (inv as { affects_stock?: boolean } | null)?.affects_stock ?? true;
        }
        modifiers.push({
          id: m.id as number,
          name: (m.name as string) ?? null,
          priceAmountCents: m.price_amount_cents != null ? Number(m.price_amount_cents) : null,
          sortOrder: Number(m.sort_order) || 0,
          squareModifierId: (m.square_modifier_id as string) ?? null,
          supplyItemId: mid,
          supplyItemName,
          supplyItemAffectsStock,
        });
      }

      modifierLists.push({
        linkSortOrder: lr.sort_order ?? null,
        minSelected: lr.min_selected ?? null,
        maxSelected: lr.max_selected ?? null,
        enabled: lr.enabled !== false,
        id: listRow.id as number,
        name: (listRow.name as string) ?? null,
        selectionType: (listRow.selection_type as string) ?? null,
        squareModifierListId: (listRow.square_modifier_list_id as string) ?? null,
        modifiers,
      });
    }

    const listIds = modifierLists.map((l) => l.id);
    const usedByRecipes: Record<
      number,
      Array<{ recipeId: number; recipeName: string; modifierCount: number }>
    > = {};
    if (listIds.length > 0) {
      const { data: usage } = await supabase
        .from('recipe_modifier_quantities')
        .select(
          'recipe_id, modifier:modifiers(id, modifier_list_id), recipe:recipes(id, name)'
        )
        .eq('enabled', true);
      for (const row of (usage || []) as unknown as Array<{
        recipe_id: number;
        modifier:
          | { id: number; modifier_list_id: number }
          | Array<{ id: number; modifier_list_id: number }>
          | null;
        recipe:
          | { id: number; name: string }
          | Array<{ id: number; name: string }>
          | null;
      }>) {
        const mod = Array.isArray(row.modifier) ? row.modifier[0] : row.modifier;
        const recipe = Array.isArray(row.recipe) ? row.recipe[0] : row.recipe;
        if (!mod || !recipe) continue;
        const listId = mod.modifier_list_id;
        if (!listIds.includes(listId)) continue;
        if (!usedByRecipes[listId]) usedByRecipes[listId] = [];
        const existing = usedByRecipes[listId].find((r) => r.recipeId === recipe.id);
        if (existing) {
          existing.modifierCount += 1;
        } else {
          usedByRecipes[listId].push({
            recipeId: recipe.id,
            recipeName: recipe.name,
            modifierCount: 1,
          });
        }
      }
    }

    return NextResponse.json({
      parentItem,
      variantMeta,
      variations,
      modifierLists,
      /** Modifier lists were loaded from this item id (parent when this row is a variant). */
      modifierListsSourceItemId: modifierSourceItemId,
      /** Per-modifier-list map of recipes that bind a quantity to this list. */
      modifierListUsageByRecipe: usedByRecipes,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load catalog';
    console.error('GET /api/items/[id]/catalog:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
