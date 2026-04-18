"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Switch } from "@kit/ui/switch";
import { Badge } from "@kit/ui/badge";
import { UnifiedSelector } from "@/components/unified-selector";
import { useItemModifierLists, useUnits } from "@kit/hooks";
import { ExternalLink, Sparkles, Zap } from "lucide-react";

export interface RecipeModifierRowInput {
  modifierId: number;
  quantity: number;
  unit?: string;
  unitId?: number;
  notes?: string;
  enabled: boolean;
}

interface Props {
  /** The recipe's primary produced item id. Modifier lists are sourced from its catalog links. */
  producedItemId: number | null;
  rows: RecipeModifierRowInput[];
  onChange: (rows: RecipeModifierRowInput[]) => void;
}

export function RecipeModifiersSection({ producedItemId, rows, onChange }: Props) {
  const { modifierLists, isLoading } = useItemModifierLists(producedItemId);
  const { data: units = [] } = useUnits();

  if (!producedItemId) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
        Select a produced item to configure its modifier quantities (e.g. Milk amount per serving).
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-md border bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">
        Loading modifier lists…
      </div>
    );
  }

  if (modifierLists.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground space-y-2">
        <p>No modifier lists are attached to this produced item.</p>
        <p className="text-xs">
          Attach modifier lists on the{" "}
          <Link
            href={`/items/${producedItemId}`}
            className="inline-flex items-center gap-1 underline underline-offset-4"
          >
            item page <ExternalLink className="h-3 w-3" />
          </Link>
          , then come back here to set per-recipe quantities.
        </p>
      </div>
    );
  }

  const rowByModifierId = new Map(rows.map((r) => [r.modifierId, r]));

  const upsertRow = (modifierId: number, patch: Partial<RecipeModifierRowInput>) => {
    const existing = rowByModifierId.get(modifierId);
    if (existing) {
      onChange(
        rows.map((r) => (r.modifierId === modifierId ? { ...r, ...patch } : r))
      );
    } else {
      onChange([
        ...rows,
        { modifierId, quantity: 0, enabled: true, ...patch },
      ]);
    }
  };

  const removeRow = (modifierId: number) => {
    onChange(rows.filter((r) => r.modifierId !== modifierId));
  };

  return (
    <div className="space-y-3">
      {modifierLists.map((list) => (
        <ListCard
          key={list.id}
          list={list}
          rowByModifierId={rowByModifierId}
          units={units}
          onUpsert={upsertRow}
          onRemove={removeRow}
        />
      ))}
    </div>
  );
}

type ModifierListItem = ReturnType<typeof useItemModifierLists>["modifierLists"][number];
type UnitItem = ReturnType<typeof useUnits>["data"] extends (infer U)[] | undefined ? U : never;

function ListCard({
  list,
  rowByModifierId,
  units,
  onUpsert,
  onRemove,
}: {
  list: ModifierListItem;
  rowByModifierId: Map<number, RecipeModifierRowInput>;
  units: UnitItem[];
  onUpsert: (modifierId: number, patch: Partial<RecipeModifierRowInput>) => void;
  onRemove: (modifierId: number) => void;
}) {
  const pricedOptions = list.modifiers.filter((m) => m.supplyItemId != null);
  const enabledCount = list.modifiers.reduce(
    (n, m) => n + (rowByModifierId.get(m.id)?.enabled ? 1 : 0),
    0
  );

  const [bulkQty, setBulkQty] = useState<string>("");
  const [bulkUnitId, setBulkUnitId] = useState<number | undefined>(undefined);

  const applyBulk = () => {
    const qty = parseFloat(bulkQty);
    if (!Number.isFinite(qty) || qty < 0) return;
    const unit = bulkUnitId ? units.find((u: { id: number }) => u.id === bulkUnitId) : undefined;
    const unitSymbol = unit ? ((unit as { symbol?: string }).symbol ?? undefined) : undefined;
    for (const m of list.modifiers) {
      if (m.supplyItemId == null) continue;
      onUpsert(m.id, {
        quantity: qty,
        unitId: bulkUnitId,
        unit: unitSymbol,
        enabled: true,
      });
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{list.name || `Modifier list #${list.id}`}</span>
            {list.selectionType && (
              <Badge variant="outline" className="text-xs">
                {list.selectionType}
              </Badge>
            )}
            {(list.minSelected != null || list.maxSelected != null) && (
              <Badge variant="outline" className="text-xs">
                {list.minSelected ?? 0}–{list.maxSelected ?? "∞"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {list.modifiers.length} option{list.modifiers.length === 1 ? "" : "s"}
            {pricedOptions.length > 0 && ` · ${pricedOptions.length} linked to stock`}
            {enabledCount > 0 && ` · ${enabledCount} included`}
          </p>
        </div>
      </div>

      {pricedOptions.length > 0 && (
        <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed bg-muted/20 p-3">
          <div className="flex-1 min-w-[120px] space-y-1">
            <Label className="text-[11px] text-muted-foreground">Apply to all</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={bulkQty}
              onChange={(e) => setBulkQty(e.target.value)}
              placeholder="Quantity"
            />
          </div>
          <div className="min-w-[120px] space-y-1">
            <Label className="text-[11px] text-muted-foreground">Unit</Label>
            <UnifiedSelector
              type="unit"
              items={units.map((u: { id: number; name?: string | null }) => ({
                ...u,
                name: (u as { name?: string; symbol?: string }).name ||
                  (u as { symbol?: string }).symbol ||
                  String(u.id),
              }))}
              selectedId={bulkUnitId}
              onSelect={(sel) => setBulkUnitId(typeof sel.id === "number" ? sel.id : Number(sel.id))}
              placeholder="Unit"
              manageLink={{ href: "/variables", text: "Variables" }}
              getDisplayName={(x) => (x as { symbol?: string }).symbol ?? x.name ?? String(x.id)}
            />
          </div>
          <Button type="button" variant="secondary" onClick={applyBulk} className="gap-1">
            <Zap className="h-3 w-3" />
            Apply
          </Button>
        </div>
      )}

      <div className="divide-y rounded-md border">
        {list.modifiers.map((m) => {
          const row = rowByModifierId.get(m.id);
          const enabled = row?.enabled ?? false;
          const noStock = m.supplyItemId == null;

          return (
            <div
              key={m.id}
              className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-[auto_1fr_140px_140px]"
            >
              <div className="flex items-center gap-2 self-center">
                <Switch
                  checked={enabled}
                  disabled={noStock}
                  onCheckedChange={(checked) => {
                    if (checked) onUpsert(m.id, { enabled: true });
                    else if (row) onRemove(m.id);
                  }}
                />
              </div>
              <div className="space-y-1 self-center">
                <p className="text-sm font-medium leading-tight">
                  {m.name || `Modifier #${m.id}`}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                  {m.supplyItemId ? (
                    <Link
                      href={`/items/${m.supplyItemId}`}
                      className="inline-flex items-center gap-1 underline underline-offset-4"
                    >
                      {m.supplyItemName ?? `Item #${m.supplyItemId}`}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">no stock item</Badge>
                  )}
                  {m.priceAmountCents != null && m.priceAmountCents !== 0 && (
                    <span>+{(m.priceAmountCents / 100).toFixed(2)}</span>
                  )}
                </p>
              </div>
              <div>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  disabled={!enabled || noStock}
                  value={row?.quantity ? row.quantity : ""}
                  onChange={(e) =>
                    onUpsert(m.id, { quantity: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="Qty"
                />
              </div>
              <div>
                <UnifiedSelector
                  type="unit"
                  items={units.map((u: { id: number; name?: string | null }) => ({
                    ...u,
                    name: (u as { name?: string; symbol?: string }).name ||
                      (u as { symbol?: string }).symbol ||
                      String(u.id),
                  }))}
                  selectedId={row?.unitId ?? undefined}
                  onSelect={(sel) => {
                    const u = units.find((x: { id: number }) => x.id === sel.id);
                    onUpsert(m.id, {
                      unitId: u?.id,
                      unit: (u as { symbol?: string } | undefined)?.symbol ?? undefined,
                    });
                  }}
                  placeholder="Unit"
                  manageLink={{ href: "/variables", text: "Variables" }}
                  getDisplayName={(x) => (x as { symbol?: string }).symbol ?? x.name ?? String(x.id)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
