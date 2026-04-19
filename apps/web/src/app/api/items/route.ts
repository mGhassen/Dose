// Items API Route
// Items are actual inventory - can be raw ingredients OR produced items (from recipes)
// Recipes are NOT items - they're separate in recipes table

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import type { Item, CreateItemData, PaginatedResponse } from '@kit/types';
import { normalizeItemKinds } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';
import { parseRequestBody, createItemSchema } from '@/shared/zod-schemas';
import { getUnitVariableMap } from '../_utils/unit-variables';
import { applyTaxRulesToItem } from '@/lib/item-taxes-resolve';
import { ensureRecipeForProduceOnSaleProduct } from '@/lib/recipes/ensure-recipe-for-produce-on-sale-product';

function mapCategoryRow(row: any): Item['category'] {
  const c = row?.category;
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    label: c.label,
    description: c.description ?? null,
    displayOrder: c.display_order ?? 0,
    isActive: c.is_active ?? true,
  };
}

function transformItem(
  row: any,
  unitMap: Map<number, { symbol: string }>,
  groupMap?: Map<number, { id: number; name: string; canonical_item_id: number; canonical_name?: string }>
): Item {
  const group = row.group_id ? groupMap?.get(row.group_id) : undefined;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    unit: unitMap.get(row.unit_id)?.symbol || '',
    unitId: row.unit_id,
    categoryId: row.category_id ?? null,
    category: mapCategoryRow(row),
    itemTypes: normalizeItemKinds(row.item_types),
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sku: row.sku,
    unitPrice: undefined,
    vendorId: row.vendor_id,
    notes: row.notes,
    producedFromRecipeId: row.produced_from_recipe_id,
    affectsStock: row.affects_stock ?? true,
    produceOnSale: row.produce_on_sale ?? false,
    isCatalogParent: row.is_catalog_parent ?? false,
    groupId: row.group_id ?? null,
    groupName: group?.name ?? null,
    isCanonical: group ? group.canonical_item_id === row.id : false,
    canonicalItemId: group?.canonical_item_id ?? null,
    canonicalItemName: group?.canonical_name ?? null,
  };
}

function transformToSnakeCase(data: CreateItemData): any {
  const result: any = {
    name: data.name,
    description: data.description,
    item_types: normalizeItemKinds(data.itemTypes ?? ['item']),
    sku: data.sku,
    vendor_id: data.vendorId,
    notes: data.notes,
    is_active: data.isActive ?? true,
  };
  if (data.categoryId !== undefined) result.category_id = data.categoryId;
  if (data.unitId != null) result.unit_id = data.unitId;
  if (data.affectsStock !== undefined) result.affects_stock = data.affectsStock;
  if (data.produceOnSale !== undefined) result.produce_on_sale = data.produceOnSale;
  return result;
}

const ITEM_SELECT_WITH_CATEGORY =
  '*, category:item_categories(id, name, label, description, display_order, is_active)';

async function buildGroupMap(
  supabase: ReturnType<typeof supabaseServer>,
  groupIds: (number | null | undefined)[]
): Promise<Map<number, { id: number; name: string; canonical_item_id: number; canonical_name?: string }>> {
  const uniqueIds = [...new Set(groupIds.filter((g): g is number => g != null))];
  const map = new Map<number, { id: number; name: string; canonical_item_id: number; canonical_name?: string }>();
  if (uniqueIds.length === 0) return map;
  const { data: groups, error } = await supabase
    .from('item_groups')
    .select('id, name, canonical_item_id')
    .in('id', uniqueIds);
  if (error) throw error;
  const canonicalIds = (groups || []).map((g: any) => g.canonical_item_id);
  const { data: canonicals } = canonicalIds.length
    ? await supabase.from('items').select('id, name').in('id', canonicalIds)
    : { data: [] as any[] };
  const nameById = new Map<number, string>((canonicals || []).map((c: any) => [c.id, c.name]));
  for (const g of groups || []) {
    map.set(g.id, {
      id: g.id,
      name: g.name,
      canonical_item_id: g.canonical_item_id,
      canonical_name: nameById.get(g.canonical_item_id),
    });
  }
  return map;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams, { maxLimit: 2000 });
    const itemType = searchParams.get('itemType');
    const includeRecipes = searchParams.get('includeRecipes') === 'true';
    const producedOnly = searchParams.get('producedOnly') === 'true';
    const excludeCatalogParents = searchParams.get('excludeCatalogParents') === 'true';

    const supabase = supabaseServer();

    let itemsQuery = supabase
      .from('items')
      .select(ITEM_SELECT_WITH_CATEGORY);

    if (itemType) {
      itemsQuery = itemsQuery.contains('item_types', [itemType]);
    }

    if (producedOnly) {
      const { data: junctionLinks } = await supabase
        .from('recipe_produced_items')
        .select('item_id');
      const fromJunction = [...new Set((junctionLinks || []).map((r: any) => r.item_id).filter(Boolean))];
      const { data: legacyLinks } = await supabase
        .from('recipes')
        .select('produced_item_id')
        .not('produced_item_id', 'is', null);
      const fromLegacy = [...new Set((legacyLinks || []).map((r: any) => r.produced_item_id).filter(Boolean))];
      const linkedIds = [...new Set([...fromJunction, ...fromLegacy])];
      if (linkedIds.length > 0) {
        itemsQuery = itemsQuery.or(`produced_from_recipe_id.not.is.null,id.in.(${linkedIds.join(',')})`);
      } else {
        itemsQuery = itemsQuery.not('produced_from_recipe_id', 'is', null);
      }
    }

    const { data: itemsData, error: itemsError } = await itemsQuery;
    if (itemsError) throw itemsError;

    let allData: any[] = [...(itemsData || [])];
    if (excludeCatalogParents) {
      allData = allData.filter((r: any) => !r.is_catalog_parent);
    }
    const unitMap = await getUnitVariableMap(
      supabase as any,
      (itemsData || []).map((r: any) => r.unit_id)
    );
    const groupMap = await buildGroupMap(
      supabase,
      (itemsData || []).map((r: any) => r.group_id)
    );

    if (includeRecipes && !producedOnly) {
      // Get produced item recipe IDs to exclude those recipes (avoid duplicates)
      const producedRecipeIds = new Set(
        (itemsData || [])
          .filter((item: any) => item.produced_from_recipe_id)
          .map((item: any) => item.produced_from_recipe_id)
      );

      const { data: allRecipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .eq('is_active', true);

      if (recipesError) throw recipesError;

      const recipesData = (allRecipesData || []).filter(
        (recipe: any) => !producedRecipeIds.has(recipe.id)
      );

      // Recipes keep legacy text `category` column; expose as label-only shape
      // so the UI can render uniformly with items (which now have a joined object).
      const recipesAsItems = (recipesData || []).map((recipe: any) => ({
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        unit: recipe.unit || 'serving',
        category_id: null,
        category: recipe.category
          ? { id: -1, name: recipe.category, label: recipe.category, display_order: 0, is_active: true }
          : null,
        item_types: ['item'],
        is_active: recipe.is_active,
        created_at: recipe.created_at,
        updated_at: recipe.updated_at,
        serving_size: recipe.serving_size,
        preparation_time: recipe.preparation_time,
        cooking_time: recipe.cooking_time,
        instructions: recipe.instructions,
        notes: recipe.notes,
      }));

      allData = [...allData, ...recipesAsItems];
    }

    // Sort by created_at descending
    allData.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    // Apply pagination manually
    const total = allData.length;
    const paginatedData = allData.slice(offset, offset + limit);

    // Transform to Item type
    const items: Item[] = paginatedData.map((row: any) => {
      if (row.instructions != null) {
        return {
          id: row.id,
          name: row.name,
          description: row.description,
          unit: row.unit || 'serving',
          unitId: row.unit_id,
          categoryId: row.category_id ?? null,
          category: mapCategoryRow(row),
          itemTypes: normalizeItemKinds(row.item_types),
          isActive: row.is_active,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          servingSize: row.serving_size,
          preparationTime: row.preparation_time,
          cookingTime: row.cooking_time,
          instructions: row.instructions,
          notes: row.notes,
        };
      } else {
        return transformItem(row, unitMap, groupMap);
      }
    });
    
    const response: PaginatedResponse<Item> = createPaginatedResponse(
      items,
      total,
      page,
      limit
    );
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseRequestBody(request, createItemSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data as CreateItemData;

    const supabase = supabaseServer();
    const { data: itemData, error } = await supabase
      .from('items')
      .insert(transformToSnakeCase(body))
      .select(ITEM_SELECT_WITH_CATEGORY)
      .single();

    if (error) throw error;

    if (itemData?.id != null) {
      try {
        await applyTaxRulesToItem(
          supabase as any,
          itemData.id,
          (itemData as any).category?.name ?? null
        );
      } catch (taxErr) {
        console.error('Error auto-applying tax rules to item:', taxErr);
      }
      if ((itemData as { produce_on_sale?: boolean }).produce_on_sale === true) {
        const link = await ensureRecipeForProduceOnSaleProduct(supabase as any, itemData.id);
        if (!link.ok) {
          return NextResponse.json({ error: link.message }, { status: 400 });
        }
        if (link.created) {
          const { data: refreshed } = await supabase
            .from('items')
            .select(ITEM_SELECT_WITH_CATEGORY)
            .eq('id', itemData.id)
            .single();
          if (refreshed) Object.assign(itemData, refreshed);
        }
      }
    }

    const unitMap = await getUnitVariableMap(supabase as any, [itemData?.unit_id]);
    const groupMap = await buildGroupMap(supabase, [itemData?.group_id]);
    return NextResponse.json(transformItem(itemData, unitMap, groupMap), { status: 201 });
  } catch (error: any) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { error: 'Failed to create item', details: error.message },
      { status: 500 }
    );
  }
}
