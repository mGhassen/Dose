import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/** True if `name` is an active row under metadata enum `ExpenseCategory`. */
export async function expenseCategoryNameIsActive(
  supabase: SupabaseClient,
  name: string
): Promise<boolean> {
  const { data: enumRow } = await supabase
    .from("metadata_enums")
    .select("id")
    .eq("name", "ExpenseCategory")
    .eq("is_active", true)
    .maybeSingle();
  if (!enumRow) return false;
  const { data: valueRow } = await supabase
    .from("metadata_enum_values")
    .select("id")
    .eq("enum_id", enumRow.id)
    .eq("name", name)
    .eq("is_active", true)
    .maybeSingle();
  return valueRow != null;
}

export function invalidExpenseCategoryResponse() {
  return NextResponse.json(
    {
      error: "Invalid expense category",
      details: "Category must be an active ExpenseCategory in metadata.",
    },
    { status: 400 }
  );
}
