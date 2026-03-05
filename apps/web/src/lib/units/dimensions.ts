/**
 * Dimensions that support unit conversion (factor to base, base_unit_id).
 * Others (currency, percentage, other) default factor to 1 and have no base unit.
 */
export const CONVERTIBLE_DIMENSIONS = ["mass", "volume", "count", "length"] as const;

export type ConvertibleDimension = (typeof CONVERTIBLE_DIMENSIONS)[number];

const convertibleSet = new Set<string>(CONVERTIBLE_DIMENSIONS);

export function isConvertibleDimension(dimension: string | undefined | null): boolean {
  if (dimension == null || dimension === "") return false;
  return convertibleSet.has(dimension);
}
