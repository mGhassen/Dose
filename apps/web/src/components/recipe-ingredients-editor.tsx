"use client";

import { useMemo } from "react";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Badge } from "@kit/ui/badge";
import { UnifiedSelector } from "@/components/unified-selector";
import { cn } from "@kit/lib/utils";
import { AlertTriangle, ChevronDown, ChevronUp, Plus, ShoppingBasket, Trash2 } from "lucide-react";

export type RecipeIngredientRowInput = {
  itemId: number;
  quantity: number;
  unit: string;
  unitId?: number;
  notes?: string;
};

type SelectorItem = {
  id: number | string;
  name?: string;
  unit?: string;
  unitId?: number;
};

type UnitItem = {
  id: number;
  name?: string | null;
  symbol?: string | null;
};

interface RecipeIngredientsEditorProps {
  rows: RecipeIngredientRowInput[];
  onChange: (rows: RecipeIngredientRowInput[]) => void;
  selectorItems: SelectorItem[];
  units: UnitItem[];
  onRequestCreateItem?: (rowIndex: number) => void;
}

export function RecipeIngredientsEditor({
  rows,
  onChange,
  selectorItems,
  units,
  onRequestCreateItem,
}: RecipeIngredientsEditorProps) {
  const duplicateItemIds = useMemo(() => {
    const counts = new Map<number, number>();
    for (const r of rows) {
      if (r.itemId > 0) counts.set(r.itemId, (counts.get(r.itemId) ?? 0) + 1);
    }
    const dups = new Set<number>();
    for (const [id, n] of counts) {
      if (n > 1) dups.add(id);
    }
    return dups;
  }, [rows]);

  const unitItemsForSelector = useMemo(
    () =>
      units.map((u) => ({
        ...u,
        name: u.name || u.symbol || String(u.id),
      })),
    [units]
  );

  const addRow = () => {
    onChange([...rows, { itemId: 0, quantity: 0, unit: "", unitId: undefined, notes: undefined }]);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const moveRow = (index: number, dir: -1 | 1) => {
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= rows.length) return;
    const next = [...rows];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  };

  const updateRow = (index: number, field: keyof RecipeIngredientRowInput, value: unknown) => {
    const copy = [...rows];
    const prev = copy[index];
    let row: RecipeIngredientRowInput = { ...prev, [field]: value } as RecipeIngredientRowInput;

    if (field === "itemId" && value != null && Number(value) > 0) {
      const id = typeof value === "number" ? value : Number(value);
      const selected = selectorItems.find((i) => Number(i.id) === id);
      if (selected) {
        row.unit = (selected.unit as string) || "";
        row.unitId = selected.unitId as number | undefined;
      }
    }

    copy[index] = row;
    onChange(copy);
  };

  const setUnitFromSelector = (index: number, selId: number | string) => {
    const u = units.find((x) => x.id === selId);
    const copy = [...rows];
    copy[index] = {
      ...copy[index],
      unitId: u?.id,
      unit: u?.symbol ?? "",
    };
    onChange(copy);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-base font-semibold">Ingredients</Label>
          {rows.length > 0 && (
            <Badge variant="secondary" className="font-normal tabular-nums">
              {rows.length}
            </Badge>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Add ingredient
        </Button>
      </div>

      {duplicateItemIds.size > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            The same ingredient is listed more than once. Combine quantities on one line unless you really need
            separate steps.
          </span>
        </div>
      )}

      <div
        className={cn(
          "rounded-lg border bg-card",
          rows.length > 0 && "max-h-[min(420px,55vh)] overflow-y-auto overscroll-contain"
        )}
      >
        {rows.length === 0 ? (
          <button
            type="button"
            onClick={addRow}
            className="flex w-full flex-col items-center gap-2 px-6 py-10 text-center text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <ShoppingBasket className="h-10 w-10 opacity-50" strokeWidth={1.25} />
            <span className="font-medium text-foreground">No ingredients yet</span>
            <span className="max-w-sm text-sm">Add everything that goes into this recipe, with amount and unit.</span>
            <span className="text-xs text-muted-foreground">Click here or use &quot;Add ingredient&quot; above</span>
          </button>
        ) : (
          <>
            <div className="sticky top-0 z-[1] hidden border-b bg-muted/40 px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur-sm sm:grid sm:grid-cols-[2rem_minmax(0,1fr)_5.5rem_6.5rem_5rem] sm:gap-2 sm:px-3">
              <span className="text-center">#</span>
              <span>Item</span>
              <span>Qty</span>
              <span>Unit</span>
              <span className="text-center"> </span>
            </div>

            <div className="divide-y">
              {rows.map((row, index) => {
                const dup = row.itemId > 0 && duplicateItemIds.has(row.itemId);
                return (
                  <div
                    key={index}
                    className={cn(
                      "p-3 sm:grid sm:grid-cols-[2rem_minmax(0,1fr)_5.5rem_6.5rem_5rem] sm:items-start sm:gap-2 sm:px-3",
                      dup && "bg-amber-500/5"
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between sm:mb-0 sm:block sm:pt-1.5">
                      <span className="text-xs font-medium text-muted-foreground sm:hidden">Line {index + 1}</span>
                      <span className="hidden text-center text-xs tabular-nums text-muted-foreground sm:block">
                        {index + 1}
                      </span>
                    </div>

                    <div className="min-w-0 space-y-2 sm:pt-0.5">
                      <UnifiedSelector
                        type="item"
                        items={selectorItems as never}
                        selectedId={row.itemId || undefined}
                        onSelect={(sel) =>
                          updateRow(index, "itemId", sel.id === 0 ? 0 : Number(sel.id))
                        }
                        onCreateNew={onRequestCreateItem ? () => onRequestCreateItem(index) : undefined}
                        placeholder="Search item…"
                        className="w-full"
                      />
                      <div className="sm:hidden">
                        <Label className="text-[11px] text-muted-foreground">Prep / note</Label>
                        <Input
                          value={row.notes ?? ""}
                          onChange={(e) => updateRow(index, "notes", e.target.value || undefined)}
                          placeholder="e.g. diced, room temp"
                          className="mt-0.5 h-8 text-sm"
                        />
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-0 sm:block sm:space-y-0">
                      <div className="space-y-1 sm:hidden">
                        <Label className="text-[11px] text-muted-foreground">Qty</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min={0}
                          value={row.quantity || ""}
                          onChange={(e) =>
                            updateRow(index, "quantity", parseFloat(e.target.value) || 0)
                          }
                          placeholder="0"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1 sm:hidden">
                        <Label className="text-[11px] text-muted-foreground">Unit</Label>
                        <UnifiedSelector
                          type="unit"
                          items={unitItemsForSelector as never}
                          selectedId={row.unitId ?? undefined}
                          onSelect={(sel) => setUnitFromSelector(index, sel.id)}
                          placeholder="Unit"
                          manageLink={{ href: "/variables", text: "Variables" }}
                          getDisplayName={(x) =>
                            (x as { symbol?: string }).symbol ?? x.name ?? String(x.id)
                          }
                        />
                      </div>
                      <div className="hidden sm:block">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min={0}
                          value={row.quantity || ""}
                          onChange={(e) =>
                            updateRow(index, "quantity", parseFloat(e.target.value) || 0)
                          }
                          placeholder="0"
                          className="h-9"
                          aria-label={`Quantity for row ${index + 1}`}
                        />
                      </div>
                    </div>

                    <div className="hidden min-w-0 sm:block sm:pt-0.5">
                      <UnifiedSelector
                        type="unit"
                        items={unitItemsForSelector as never}
                        selectedId={row.unitId ?? undefined}
                        onSelect={(sel) => setUnitFromSelector(index, sel.id)}
                        placeholder="Unit"
                        manageLink={{ href: "/variables", text: "Variables" }}
                        getDisplayName={(x) =>
                          (x as { symbol?: string }).symbol ?? x.name ?? String(x.id)
                        }
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-end gap-0.5 sm:mt-0 sm:justify-center sm:pt-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        disabled={index === 0}
                        onClick={() => moveRow(index, -1)}
                        aria-label="Move ingredient up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        disabled={index >= rows.length - 1}
                        onClick={() => moveRow(index, 1)}
                        aria-label="Move ingredient down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeRow(index)}
                        aria-label="Remove ingredient"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="col-span-full hidden px-0 pt-1 sm:block">
                      <Input
                        value={row.notes ?? ""}
                        onChange={(e) => updateRow(index, "notes", e.target.value || undefined)}
                        placeholder="Prep / note (optional) — e.g. diced, sifted"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
