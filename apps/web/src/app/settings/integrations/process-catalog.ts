export function processCatalogData(catalog: { objects?: any[] } | null): any[] {
  if (!catalog?.objects || catalog.objects.length === 0) return [];

  const objects = catalog.objects;
  const itemsMap = new Map<string, any>();
  const variationsMap = new Map<string, any[]>();
  const categoriesMap = new Map<string, any>();
  const modifierListsMap = new Map<string, any>();
  const modifiersMap = new Map<string, any[]>();
  const taxesMap = new Map<string, any>();

  objects.forEach((obj: any) => {
    switch (obj.type) {
      case 'ITEM':
        itemsMap.set(obj.id, obj);
        variationsMap.set(obj.id, []);
        break;
      case 'ITEM_VARIATION': {
        const itemId = obj.item_variation_data?.item_id;
        if (itemId) {
          if (!variationsMap.has(itemId)) variationsMap.set(itemId, []);
          variationsMap.get(itemId)!.push(obj);
        }
        break;
      }
      case 'CATEGORY':
        categoriesMap.set(obj.id, obj);
        break;
      case 'MODIFIER_LIST':
        modifierListsMap.set(obj.id, obj);
        modifiersMap.set(obj.id, []);
        break;
      case 'MODIFIER': {
        const modifierListId = obj.modifier_data?.modifier_list_id;
        if (modifierListId) {
          if (!modifiersMap.has(modifierListId)) modifiersMap.set(modifierListId, []);
          modifiersMap.get(modifierListId)!.push(obj);
        }
        break;
      }
      case 'TAX':
        taxesMap.set(obj.id, obj);
        break;
    }
  });

  const mergedItems: any[] = [];
  itemsMap.forEach((item, itemId) => {
    const categoryId = item.item_data?.category_id;
    const category = categoryId ? categoriesMap.get(categoryId) : null;
    const variations = variationsMap.get(itemId) || [];
    const modifierListInfos = item.item_data?.modifier_list_info || [];
    const modifierListsWithModifiers = modifierListInfos.map((modListInfo: any) => {
      const modListId = modListInfo.modifier_list_id;
      return {
        ...modListInfo,
        modifierList: modifierListsMap.get(modListId),
        modifiers: modifiersMap.get(modListId) || [],
      };
    });
    const taxIds = item.item_data?.tax_ids || [];
    const taxes = taxIds.map((taxId: string) => taxesMap.get(taxId)).filter(Boolean);

    mergedItems.push({
      id: itemId,
      type: 'ITEM',
      name: item.item_data?.name || 'Unknown',
      description: item.item_data?.description || '',
      category,
      categoryName: category?.category_data?.name || '',
      variations,
      modifierLists: modifierListsWithModifiers,
      taxes,
      taxIds,
      is_deleted: item.is_deleted || false,
      updated_at: item.updated_at,
      _original: item,
    });
  });

  return mergedItems;
}
