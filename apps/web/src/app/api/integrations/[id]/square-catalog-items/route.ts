import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@kit/lib/supabase";
import { ensureRecipeForProduceOnSaleProduct } from "@/lib/recipes/ensure-recipe-for-produce-on-sale-product";

async function getIntegrationForAccount(supabase: ReturnType<typeof supabaseServer>, integrationId: string, token: string) {
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return { integration: null, error: { status: 401 as const, message: "Unauthorized" } };
  const { data: account } = await supabase.from("accounts").select("id").eq("auth_user_id", user.id).single();
  if (!account) return { integration: null, error: { status: 404 as const, message: "Account not found" } };
  const { data: integration, error } = await supabase
    .from("integrations")
    .select("id, integration_type")
    .eq("id", integrationId)
    .eq("account_id", account.id)
    .single();
  if (error || !integration) return { integration: null, error: { status: 404 as const, message: "Integration not found" } };
  return { integration, error: null };
}

export type SquareCatalogItemRow = {
  itemId: number;
  name: string;
  sourceType: string;
  sourceId: string;
  produceOnSale: boolean;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = _request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 });
    }
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const supabase = supabaseServer();
    const { integration, error: accessError } = await getIntegrationForAccount(supabase, id, token);
    if (accessError) {
      return NextResponse.json({ error: accessError.message }, { status: accessError.status });
    }
    if (integration?.integration_type !== "square") {
      return NextResponse.json({ error: "Not a Square integration" }, { status: 400 });
    }

    const { data: mappings, error: mapErr } = await supabase
      .from("integration_entity_mapping")
      .select("source_type, source_id, app_entity_id")
      .eq("integration_id", id)
      .eq("app_entity_type", "item")
      .in("source_type", ["catalog_variation", "catalog_item"]);

    if (mapErr) throw mapErr;

    const itemIds = [...new Set((mappings ?? []).map((m: { app_entity_id: number }) => m.app_entity_id).filter(Boolean))];
    if (itemIds.length === 0) {
      return NextResponse.json({ items: [] as SquareCatalogItemRow[] });
    }

    const { data: items, error: itemsErr } = await supabase
      .from("items")
      .select("id, name, produce_on_sale")
      .in("id", itemIds)
      .eq("is_catalog_parent", false);

    if (itemsErr) throw itemsErr;

    const byId = new Map((items ?? []).map((r: { id: number; name: string; produce_on_sale?: boolean }) => [r.id, r]));
    const rows: SquareCatalogItemRow[] = [];
    for (const m of mappings ?? []) {
      const row = byId.get((m as { app_entity_id: number }).app_entity_id);
      if (!row) continue;
      rows.push({
        itemId: row.id,
        name: row.name,
        sourceType: (m as { source_type: string }).source_type,
        sourceId: (m as { source_id: string }).source_id,
        produceOnSale: row.produce_on_sale ?? false,
      });
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ items: rows });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load catalog items";
    console.error("square-catalog-items GET:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 });
    }
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const supabase = supabaseServer();
    const { integration, error: accessError } = await getIntegrationForAccount(supabase, id, token);
    if (accessError) {
      return NextResponse.json({ error: accessError.message }, { status: accessError.status });
    }
    if (integration?.integration_type !== "square") {
      return NextResponse.json({ error: "Not a Square integration" }, { status: 400 });
    }

    const body = (await request.json()) as { updates?: { itemId: number; produceOnSale: boolean }[] };
    const updates = body?.updates;
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "updates array required" }, { status: 400 });
    }

    const { data: mappings } = await supabase
      .from("integration_entity_mapping")
      .select("app_entity_id")
      .eq("integration_id", id)
      .eq("app_entity_type", "item")
      .in("source_type", ["catalog_variation", "catalog_item"]);
    const allowed = new Set((mappings ?? []).map((m: { app_entity_id: number }) => m.app_entity_id));

    for (const u of updates) {
      if (typeof u.itemId !== "number" || typeof u.produceOnSale !== "boolean") {
        return NextResponse.json({ error: "Invalid update row" }, { status: 400 });
      }
      if (!allowed.has(u.itemId)) {
        return NextResponse.json({ error: `Item ${u.itemId} is not mapped to this integration` }, { status: 403 });
      }
      const { error } = await supabase.from("items").update({ produce_on_sale: u.produceOnSale }).eq("id", u.itemId);
      if (error) throw error;
      if (u.produceOnSale) {
        const link = await ensureRecipeForProduceOnSaleProduct(supabase, u.itemId);
        if (!link.ok) {
          return NextResponse.json({ error: link.message, itemId: u.itemId }, { status: 400 });
        }
      }
    }

    return NextResponse.json({ ok: true, updated: updates.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update";
    console.error("square-catalog-items PATCH:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
