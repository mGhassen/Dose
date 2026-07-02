export const CATALOG_MAPPING_SOURCE_TYPES = [
  'catalog_item',
  'catalog_variation',
  'catalog_category',
  'catalog_modifier',
  'catalog_modifier_list',
  'catalog_modifier_item',
  'catalog_tax',
] as const;

export function mappingSourceTypesForDataType(dataType: string): string[] {
  switch (dataType) {
    case 'order':
      return ['order'];
    case 'payment':
      return ['payment'];
    case 'catalog_object':
      return [...CATALOG_MAPPING_SOURCE_TYPES];
    default:
      return [];
  }
}
