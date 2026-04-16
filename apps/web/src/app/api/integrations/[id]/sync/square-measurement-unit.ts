/**
 * Map Square MEASUREMENT_UNIT catalog objects to Dose `variables` (type=unit) and resolve IDs.
 */

import { getMappedAppEntityId, insertMapping } from './square-import';
import type { SquareCatalogMeasurementUnit } from '@kit/types';

type SupabaseClient = { from: (table: string) => any };

type UnitFields = {
  name: string;
  symbol: string;
  dimension: string;
  value: number;
  baseUnitId: number | null;
};

/** Map common Square Catalog API enum strings to display symbol + dimension. */
const WEIGHT_UNIT_MAP: Record<string, Pick<UnitFields, 'symbol' | 'dimension' | 'name'>> = {
  METRIC_GRAM: { symbol: 'g', dimension: 'mass', name: 'Gram' },
  METRIC_KILOGRAM: { symbol: 'kg', dimension: 'mass', name: 'Kilogram' },
  METRIC_MILLIGRAM: { symbol: 'mg', dimension: 'mass', name: 'Milligram' },
  METRIC_TONNE: { symbol: 't', dimension: 'mass', name: 'Tonne' },
  IMPERIAL_POUND: { symbol: 'lb', dimension: 'mass', name: 'Pound' },
  IMPERIAL_OUNCE: { symbol: 'oz', dimension: 'mass', name: 'Ounce' },
  IMPERIAL_STONE: { symbol: 'st', dimension: 'mass', name: 'Stone' },
};

const VOLUME_UNIT_MAP: Record<string, Pick<UnitFields, 'symbol' | 'dimension' | 'name'>> = {
  METRIC_LITER: { symbol: 'L', dimension: 'volume', name: 'Liter' },
  METRIC_MILLILITER: { symbol: 'mL', dimension: 'volume', name: 'Milliliter' },
  METRIC_GALLON: { symbol: 'gal', dimension: 'volume', name: 'Gallon (metric)' },
  IMPERIAL_GALLON: { symbol: 'gal', dimension: 'volume', name: 'Gallon (imperial)' },
  IMPERIAL_QUART: { symbol: 'qt', dimension: 'volume', name: 'Quart' },
  IMPERIAL_PINT: { symbol: 'pt', dimension: 'volume', name: 'Pint' },
  IMPERIAL_FLUID_OUNCE: { symbol: 'fl oz', dimension: 'volume', name: 'Fluid ounce' },
};

const GENERIC_UNIT_MAP: Record<string, Pick<UnitFields, 'symbol' | 'dimension' | 'name'>> = {
  UNIT: { symbol: 'unit', dimension: 'count', name: 'Unit' },
};

function sanitizeSymbol(raw: string): string {
  const s = raw.replace(/^METRIC_|^IMPERIAL_/i, '').slice(0, 40);
  return s.length > 0 ? s.toLowerCase() : 'unit';
}

export function squareMeasurementUnitToVariableFields(obj: {
  measurement_unit_data?: SquareCatalogMeasurementUnit;
}): UnitFields {
  const mu = obj.measurement_unit_data?.measurement_unit;
  if (!mu) {
    return { name: 'Unit', symbol: 'unit', dimension: 'other', value: 1, baseUnitId: null };
  }
  if (mu.custom_unit) {
    const abbr = mu.custom_unit.abbreviation?.trim() || mu.custom_unit.name?.trim() || 'unit';
    return {
      name: mu.custom_unit.name?.trim() || abbr,
      symbol: abbr,
      dimension: 'other',
      value: 1,
      baseUnitId: null,
    };
  }
  if (mu.weight_unit) {
    const m = WEIGHT_UNIT_MAP[mu.weight_unit];
    if (m) return { name: m.name, symbol: m.symbol, dimension: m.dimension, value: 1, baseUnitId: null };
  }
  if (mu.volume_unit) {
    const m = VOLUME_UNIT_MAP[mu.volume_unit];
    if (m) return { name: m.name, symbol: m.symbol, dimension: m.dimension, value: 1, baseUnitId: null };
  }
  if (mu.generic_unit) {
    const m = GENERIC_UNIT_MAP[mu.generic_unit];
    if (m) return { name: m.name, symbol: m.symbol, dimension: m.dimension, value: 1, baseUnitId: null };
  }
  const raw =
    mu.weight_unit || mu.volume_unit || mu.length_unit || mu.area_unit || mu.generic_unit || mu.time_unit || 'UNIT';
  const sym = sanitizeSymbol(String(raw));
  return {
    name: String(raw),
    symbol: sym,
    dimension: 'other',
    value: 1,
    baseUnitId: null,
  };
}

export async function getDefaultUnitVariableId(supabase: SupabaseClient): Promise<number | null> {
  const { data } = await supabase
    .from('variables')
    .select('id')
    .eq('type', 'unit')
    .eq('payload->>symbol', 'unit')
    .maybeSingle();
  return data?.id ?? null;
}

export async function resolveSquareMeasurementUnitId(
  supabase: SupabaseClient,
  integrationId: number,
  squareMeasurementUnitCatalogId: string,
  measurementUnitObject: { measurement_unit_data?: SquareCatalogMeasurementUnit } | null,
  defaultUnitVariableId: number | null
): Promise<number | null> {
  if (!squareMeasurementUnitCatalogId?.trim()) {
    return defaultUnitVariableId;
  }
  if (!measurementUnitObject?.measurement_unit_data) {
    return defaultUnitVariableId;
  }

  const mapped = await getMappedAppEntityId(
    supabase,
    integrationId,
    'measurement_unit',
    squareMeasurementUnitCatalogId
  );
  if (mapped != null) return mapped;

  const fields = squareMeasurementUnitToVariableFields(measurementUnitObject);

  const { data: existing } = await supabase
    .from('variables')
    .select('id')
    .eq('type', 'unit')
    .eq('payload->>symbol', fields.symbol)
    .maybeSingle();

  if (existing?.id != null) {
    await insertMapping(
      supabase,
      integrationId,
      'measurement_unit',
      squareMeasurementUnitCatalogId,
      'variable',
      existing.id
    );
    return existing.id;
  }

  const insertRow = {
    name: fields.name,
    type: 'unit',
    value: fields.value,
    unit: null,
    effective_date: null,
    end_date: null,
    description: null,
    is_active: true,
    payload: {
      symbol: fields.symbol,
      dimension: fields.dimension,
      base_unit_id: fields.baseUnitId,
    },
  };

  const { data: created, error } = await supabase.from('variables').insert(insertRow).select('id').single();
  if (error) {
    const { data: again } = await supabase
      .from('variables')
      .select('id')
      .eq('type', 'unit')
      .eq('payload->>symbol', fields.symbol)
      .maybeSingle();
    if (again?.id != null) {
      await insertMapping(
        supabase,
        integrationId,
        'measurement_unit',
        squareMeasurementUnitCatalogId,
        'variable',
        again.id
      );
      return again.id;
    }
    throw error;
  }

  await insertMapping(
    supabase,
    integrationId,
    'measurement_unit',
    squareMeasurementUnitCatalogId,
    'variable',
    created.id
  );
  return created.id;
}
