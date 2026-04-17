"use client";

import { useState, useMemo } from "react";
import { Button } from "@kit/ui/button";
import { Label } from "@kit/ui/label";
import { RadioGroup, RadioGroupItem } from "@kit/ui/radio-group";
import { Checkbox } from "@kit/ui/checkbox";
import { ScrollArea } from "@kit/ui/scroll-area";
import { X } from "lucide-react";
import {
  useCreateTaxRule,
  useVariablesByType,
  useMetadataEnum,
  useItems,
} from "@kit/hooks";
import type { CreateTaxRuleData } from "@kit/types";
import type { Item } from "@kit/types";
import { toast } from "sonner";
import { cn } from "@kit/lib/utils";
import { UnifiedSelector } from "@/components/unified-selector";

export interface TaxRuleCreateContentProps {
  onClose: () => void;
  onCreated?: (id: number) => void;
}

export function TaxRuleCreateContent({ onClose, onCreated }: TaxRuleCreateContentProps) {
  const createRule = useCreateTaxRule();
  const { data: transactionTaxVars = [] } = useVariablesByType("transaction_tax");
  const { data: taxVars = [] } = useVariablesByType("tax");
  const taxVariables = useMemo(
    () => [...transactionTaxVars, ...taxVars],
    [transactionTaxVars, taxVars]
  );
  const { data: salesTypeValues = [] } = useMetadataEnum("SalesType");
  const { data: itemsResponse } = useItems({ limit: 2000 });
  const items: Item[] = useMemo(() => itemsResponse?.data ?? [], [itemsResponse]);
  const categories = useMemo(
    () =>
      [...new Set(items.map((i) => i.category?.name).filter((c): c is string => !!c))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [items]
  );

  const [variableId, setVariableId] = useState<number | null>(null);
  const [conditionType, setConditionType] = useState<"sales_type" | "expense">("sales_type");
  const [conditionValues, setConditionValues] = useState<string[]>([]);
  const [scopeType, setScopeType] = useState<"all" | "items" | "categories">("all");
  const [scopeItemIds, setScopeItemIds] = useState<number[]>([]);
  const [scopeCategories, setScopeCategories] = useState<string[]>([]);
  const [ruleType, setRuleType] = useState<"taxable" | "exemption">("taxable");
  const [calculationType, setCalculationType] = useState<"additive" | "inclusive">("additive");
  const [priority, setPriority] = useState(0);
  const [applyToCustomAmounts, setApplyToCustomAmounts] = useState(true);
  const [applyToFutureItems, setApplyToFutureItems] = useState(true);

  const variableOptions = useMemo(
    () =>
      taxVariables.map((v) => ({
        id: String(v.id),
        name: `${v.name} (${v.value}%)`,
      })),
    [taxVariables]
  );
  const salesTypeOptions = useMemo(
    () =>
      salesTypeValues.map((ev) => ({
        id: ev.name,
        name: ev.label ?? ev.name,
      })),
    [salesTypeValues]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (variableId == null) {
      toast.error("Select a transaction tax variable");
      return;
    }
    if (conditionType === "sales_type" && conditionValues.length === 0) {
      toast.error("Select at least one dining option for sales");
      return;
    }
    const data: CreateTaxRuleData = {
      variableId,
      conditionType: conditionType === "expense" ? "expense" : "sales_type",
      conditionValues: conditionType === "sales_type" ? conditionValues : null,
      conditionValue: conditionType === "sales_type" && conditionValues.length === 1 ? conditionValues[0] : null,
      scopeType,
      scopeItemIds: scopeType === "items" ? scopeItemIds : null,
      scopeCategories: scopeType === "categories" ? scopeCategories : null,
      ruleType,
      calculationType,
      priority,
      applyToCustomAmounts,
      applyToFutureItems,
    };
    try {
      const created = await createRule.mutateAsync(data);
      toast.success("Tax rule created");
      onCreated?.(created.id);
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to create");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border pb-4">
        <h2 className="text-lg font-semibold">New tax rule</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <ScrollArea className="min-h-0 flex-1 pr-2">
          <div className="space-y-6 pb-6 pt-4">
            <div className="space-y-2">
              <Label>Transaction tax (variable)</Label>
              <UnifiedSelector
                items={variableOptions}
                selectedId={variableId ?? undefined}
                onSelect={(item) => setVariableId(item.id != null ? Number(item.id) : null)}
                placeholder="Select variable"
              />
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <RadioGroup
                value={conditionType}
                onValueChange={(v) => setConditionType(v as "sales_type" | "expense")}
                className="flex gap-4"
              >
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <RadioGroupItem value="sales_type" />
                  <span>Dining option (sales)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <RadioGroupItem value="expense" />
                  <span>Expense</span>
                </label>
              </RadioGroup>
              {conditionType === "sales_type" && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {salesTypeOptions.map((opt) => (
                    <label
                      key={opt.id}
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1.5 text-sm border cursor-pointer",
                        conditionValues.includes(opt.id) ? "border-primary bg-primary/10" : "border-border"
                      )}
                    >
                      <Checkbox
                        checked={conditionValues.includes(opt.id)}
                        onCheckedChange={(c) =>
                          setConditionValues((prev) =>
                            c ? [...prev, opt.id] : prev.filter((x) => x !== opt.id)
                          )
                        }
                        className="sr-only"
                      />
                      {opt.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Rule type</Label>
              <RadioGroup
                value={ruleType}
                onValueChange={(v) => setRuleType(v as "taxable" | "exemption")}
                className="flex gap-4"
              >
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <RadioGroupItem value="taxable" />
                  <span>Apply tax — use this variable&apos;s rate for items matching this condition</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <RadioGroupItem value="exemption" />
                  <span>Exempt — do not apply tax (0%) when this condition is met</span>
                </label>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Tax calculation</Label>
              <RadioGroup
                value={calculationType}
                onValueChange={(v) => setCalculationType(v as "additive" | "inclusive")}
                className="space-y-3"
              >
                <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-4 has-[:checked]:border-primary text-sm">
                  <span className="inline-flex size-4 shrink-0 mt-0.5 items-center justify-center">
                    <RadioGroupItem value="additive" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">Additive tax</p>
                    <p className="text-muted-foreground">
                      Taxes are added on top of the unit price and show up as a separate line item. Most common in North America.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-4 has-[:checked]:border-primary text-sm">
                  <span className="inline-flex size-4 shrink-0 mt-0.5 items-center justify-center">
                    <RadioGroupItem value="inclusive" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">Inclusive tax</p>
                    <p className="text-muted-foreground">
                      Tax is included in the price. Shown on receipts but not added to total. Most common in Europe, Australia, Japan.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <div className="flex gap-2 flex-wrap">
                {(["all", "items", "categories"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScopeType(s)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm",
                      scopeType === s ? "border-primary bg-primary/10" : "border-border"
                    )}
                  >
                    {s === "all" ? "All items" : s === "items" ? "Selected items" : "Selected categories"}
                  </button>
                ))}
              </div>
              {scopeType === "items" && (
                <ScrollArea className="h-40 rounded border p-2 mt-2">
                  <div className="flex flex-col gap-1">
                    {items.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 py-1 text-sm cursor-pointer">
                        <Checkbox
                          checked={scopeItemIds.includes(item.id)}
                          onCheckedChange={(c) =>
                            setScopeItemIds((prev) =>
                              c ? [...prev, item.id] : prev.filter((id) => id !== item.id)
                            )
                          }
                        />
                        <span className="truncate">
                          {item.name}
                          {item.category && <span className="text-muted-foreground"> ({item.category.label ?? item.category.name})</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              )}
              {scopeType === "categories" && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {categories.map((cat) => (
                    <label
                      key={cat}
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1.5 text-sm border cursor-pointer",
                        scopeCategories.includes(cat) ? "border-primary bg-primary/10" : "border-border"
                      )}
                    >
                      <Checkbox
                        checked={scopeCategories.includes(cat)}
                        onCheckedChange={(c) =>
                          setScopeCategories((prev) =>
                            c ? [...prev, cat] : prev.filter((x) => x !== cat)
                          )
                        }
                        className="sr-only"
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="apply-future">Apply to current and future items</Label>
              <Checkbox
                id="apply-future"
                checked={applyToFutureItems}
                onCheckedChange={(c) => setApplyToFutureItems(c === true)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="apply-custom">Apply to custom amounts</Label>
              <Checkbox
                id="apply-custom"
                checked={applyToCustomAmounts}
                onCheckedChange={(c) => setApplyToCustomAmounts(c === true)}
              />
            </div>
          </div>
        </ScrollArea>
        <div className="mt-auto flex shrink-0 gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={createRule.isPending} className="flex-1">
            {createRule.isPending ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}
