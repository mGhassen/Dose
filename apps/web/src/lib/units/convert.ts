/**
 * Unit conversion: quantities use factor_to_base (multiply quantity by factor to get base amount).
 * E.g. base = g: kg has factor 1000, so 1 kg = 1000 g.
 */

export interface UnitFactor {
  id: number;
  factorToBase: number;
}

export interface UnitConversionInput extends UnitFactor {
  dimension?: string | null;
  baseUnitId?: number | null;
  symbol?: string | null;
}

export interface UnitConversionContext {
  factorMap: Map<number, number>;
  dimensionMap: Map<number, string>;
  baseUnitIdMap: Map<number, number | null>;
  symbolMap: Map<number, string>;
}

export type UnitConversionWarningReason =
  | "missing_factor"
  | "dimension_mismatch"
  | "base_unit_mismatch";

export interface UnitConversionWarning {
  reason: UnitConversionWarningReason;
  fromUnitId: number;
  toUnitId: number;
  detail: string;
}

export interface UnitConversionResult {
  quantity: number;
  converted: boolean;
  warning?: UnitConversionWarning;
}

export interface UnitPriceConversionResult {
  unitPrice: number;
  converted: boolean;
  warning?: UnitConversionWarning;
}

export function buildUnitConversionContext(units: UnitConversionInput[]): UnitConversionContext {
  const factorMap = new Map<number, number>();
  const dimensionMap = new Map<number, string>();
  const baseUnitIdMap = new Map<number, number | null>();
  const symbolMap = new Map<number, string>();
  for (const unit of units) {
    factorMap.set(unit.id, unit.factorToBase);
    if (unit.dimension && unit.dimension.trim()) {
      dimensionMap.set(unit.id, unit.dimension.trim());
    }
    baseUnitIdMap.set(unit.id, unit.baseUnitId ?? null);
    if (unit.symbol && unit.symbol.trim()) {
      symbolMap.set(unit.id, unit.symbol.trim());
    }
  }
  return { factorMap, dimensionMap, baseUnitIdMap, symbolMap };
}

function formatUnitLabel(unitId: number, context: UnitConversionContext): string {
  return context.symbolMap.get(unitId) ?? `unit#${unitId}`;
}

function mismatchWarning(
  reason: UnitConversionWarningReason,
  fromUnitId: number,
  toUnitId: number,
  context: UnitConversionContext
): UnitConversionWarning {
  const fromLabel = formatUnitLabel(fromUnitId, context);
  const toLabel = formatUnitLabel(toUnitId, context);
  if (reason === "missing_factor") {
    return {
      reason,
      fromUnitId,
      toUnitId,
      detail: `Missing factor for conversion ${fromLabel} -> ${toLabel}`,
    };
  }
  if (reason === "dimension_mismatch") {
    return {
      reason,
      fromUnitId,
      toUnitId,
      detail: `Dimension mismatch for conversion ${fromLabel} -> ${toLabel}`,
    };
  }
  return {
    reason,
    fromUnitId,
    toUnitId,
    detail: `Base-unit mismatch for conversion ${fromLabel} -> ${toLabel}`,
  };
}

function canConvert(
  fromUnitId: number,
  toUnitId: number,
  context: UnitConversionContext
): UnitConversionWarning | null {
  const fromFactor = context.factorMap.get(fromUnitId);
  const toFactor = context.factorMap.get(toUnitId);
  if (fromFactor == null || toFactor == null || toFactor === 0) {
    return mismatchWarning("missing_factor", fromUnitId, toUnitId, context);
  }
  const fromDimension = context.dimensionMap.get(fromUnitId);
  const toDimension = context.dimensionMap.get(toUnitId);
  if (fromDimension && toDimension && fromDimension !== toDimension) {
    return mismatchWarning("dimension_mismatch", fromUnitId, toUnitId, context);
  }
  const fromBase = context.baseUnitIdMap.get(fromUnitId);
  const toBase = context.baseUnitIdMap.get(toUnitId);
  if (fromBase != null && toBase != null && fromBase !== toBase) {
    return mismatchWarning("base_unit_mismatch", fromUnitId, toUnitId, context);
  }
  return null;
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

export function convertQuantityWithContext(
  quantity: number,
  fromUnitId: number | null | undefined,
  toUnitId: number | null | undefined,
  context: UnitConversionContext
): UnitConversionResult {
  if (fromUnitId == null || toUnitId == null || fromUnitId === toUnitId) {
    return { quantity, converted: false };
  }
  const warning = canConvert(fromUnitId, toUnitId, context);
  if (warning) {
    return { quantity, converted: false, warning };
  }
  const fromFactor = context.factorMap.get(fromUnitId)!;
  const toFactor = context.factorMap.get(toUnitId)!;
  return {
    quantity: (quantity * fromFactor) / toFactor,
    converted: true,
  };
}

export function convertUnitPriceWithContext(
  unitPrice: number,
  fromUnitId: number | null | undefined,
  toUnitId: number | null | undefined,
  context: UnitConversionContext
): UnitPriceConversionResult {
  if (fromUnitId == null || toUnitId == null || fromUnitId === toUnitId) {
    return { unitPrice, converted: false };
  }
  const quantityResult = convertQuantityWithContext(1, fromUnitId, toUnitId, context);
  if (!quantityResult.converted) {
    return {
      unitPrice,
      converted: false,
      warning: quantityResult.warning,
    };
  }
  if (quantityResult.quantity === 0) {
    return {
      unitPrice,
      converted: false,
      warning: mismatchWarning("missing_factor", fromUnitId, toUnitId, context),
    };
  }
  return {
    unitPrice: unitPrice / quantityResult.quantity,
    converted: true,
  };
}

export function logUnitConversionWarning(scope: string, warning: UnitConversionWarning): void {
  console.warn(`[${scope}] ${warning.detail}`);
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
