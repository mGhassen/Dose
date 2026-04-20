import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildUnitConversionContext,
  type UnitConversionContext,
  type UnitConversionInput,
} from "@/lib/units/convert";

type UnitVariableRow = {
  id: number;
  value: string | number | null;
  payload?: {
    dimension?: string | null;
    base_unit_id?: number | null;
    symbol?: string | null;
  } | null;
};

export async function loadUnitConversionContext(
  supabase: SupabaseClient
): Promise<UnitConversionContext> {
  const { data, error } = await supabase
    .from("variables")
    .select("id, value, payload")
    .eq("type", "unit");
  if (error) throw error;

  const units: UnitConversionInput[] = (data as UnitVariableRow[] | null | undefined)?.map((row) => {
    const payload = row.payload || {};
    return {
      id: row.id,
      factorToBase: Number.parseFloat(String(row.value ?? 1)) || 1,
      dimension: payload.dimension ?? null,
      baseUnitId: payload.base_unit_id ?? null,
      symbol: payload.symbol ?? null,
    };
  }) ?? [];

  return buildUnitConversionContext(units);
}
