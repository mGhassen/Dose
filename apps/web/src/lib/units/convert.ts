/**
 * Unit conversion: quantities use factor_to_base (multiply quantity by factor to get base amount).
 * E.g. base = g: kg has factor 1000, so 1 kg = 1000 g.
 */

export interface UnitFactor {
  id: number;
  factorToBase: number;
}

/**
 * Convert quantity from fromUnitId to toUnitId using factor map.
 * If either unit is missing, returns original quantity (no conversion).
 */
export function convertQuantity(
  quantity: number,
  fromUnitId: number | null | undefined,
  toUnitId: number | null | undefined,
  getFactor: (unitId: number) => number | undefined
): number {
  if (fromUnitId == null || toUnitId == null || fromUnitId === toUnitId) return quantity;
  const fromF = getFactor(fromUnitId);
  const toF = getFactor(toUnitId);
  if (fromF == null || toF == null || toF === 0) return quantity;
  return (quantity * fromF) / toF;
}

/**
 * Convert quantity to base unit (e.g. g, L, unit).
 */
export function toBaseQuantity(quantity: number, unitId: number | null | undefined, getFactor: (unitId: number) => number | undefined): number {
  if (unitId == null) return quantity;
  const f = getFactor(unitId);
  if (f == null) return quantity;
  return quantity * f;
}

/**
 * Convert quantity from base unit to target unit.
 */
export function fromBaseQuantity(quantityInBase: number, toUnitId: number | null | undefined, getFactor: (unitId: number) => number | undefined): number {
  if (toUnitId == null) return quantityInBase;
  const f = getFactor(toUnitId);
  if (f == null || f === 0) return quantityInBase;
  return quantityInBase / f;
}

export function buildFactorMap(units: UnitFactor[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const u of units) map.set(u.id, u.factorToBase);
  return map;
}
