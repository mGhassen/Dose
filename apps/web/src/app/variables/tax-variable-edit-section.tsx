"use client";

import { useMemo, useState, useEffect } from "react";
import { Button } from "@kit/ui/button";
import { Label } from "@kit/ui/label";
import { Switch } from "@kit/ui/switch";
import { RadioGroup, RadioGroupItem } from "@kit/ui/radio-group";
import { Checkbox } from "@kit/ui/checkbox";
import { ScrollArea } from "@kit/ui/scroll-area";
import { Badge } from "@kit/ui/badge";
import {
  useTaxRules,
  useCreateTaxRule,
  useUpdateTaxRule,
  useUpdateVariable,
  useItems,
} from "@kit/hooks";
import type { Variable, CreateTaxRuleData } from "@kit/types";
import type { VariablePayloadTax } from "@kit/types";
import type { Item } from "@kit/types";
import { toast } from "sonner";
import { cn } from "@kit/lib/utils";

const DEFAULT_PRIORITY = 999;

function RuleCard({
  badge,
  children,
}: {
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Badge variant="secondary" className="text-xs font-normal">
          {badge}
        </Badge>
      </div>
      {children}
    </div>
  );
}

export interface TaxVariableEditSectionProps {
  variableId: string;
  variable: Variable;
}

export function TaxVariableEditSection({ variableId, variable }: TaxVariableEditSectionProps) {
  const payload = (variable.payload || {}) as VariablePayloadTax;
  const { data: rules = [] } = useTaxRules({ variableId: variable.id });
  const createRule = useCreateTaxRule();
  const updateRule = useUpdateTaxRule();
  const updateVariable = useUpdateVariable();
  const { data: itemsResponse } = useItems({ limit: 2000 });
  const items: Item[] = useMemo(() => itemsResponse?.data ?? [], [itemsResponse]);
  const categories = useMemo(
    () =>
      [...new Set(items.map((i) => i.category).filter((c): c is string => !!c))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [items]
  );

  const defaultRule = useMemo(
    () => rules.find((r) => r.conditionType === null) ?? null,
    [rules]
  );

  const [applicationScope, setApplicationScope] = useState<"all" | "items" | "categories">("all");
  const [applicationItemIds, setApplicationItemIds] = useState<number[]>([]);
  const [applicationCategories, setApplicationCategories] = useState<string[]>([]);
  const [applyToCustomAmounts, setApplyToCustomAmounts] = useState(true);
  const [applyToFutureItems, setApplyToFutureItems] = useState(true);

  useEffect(() => {
    if (defaultRule) {
      setApplicationScope(defaultRule.scopeType ?? "all");
      setApplicationItemIds(defaultRule.scopeItemIds ?? []);
      setApplicationCategories(defaultRule.scopeCategories ?? []);
      setApplyToCustomAmounts(defaultRule.applyToCustomAmounts ?? true);
      setApplyToFutureItems(defaultRule.applyToFutureItems ?? true);
    }
  }, [defaultRule?.id, defaultRule?.scopeType, defaultRule?.scopeItemIds, defaultRule?.scopeCategories, defaultRule?.applyToCustomAmounts, defaultRule?.applyToFutureItems]);

  const [calculationType, setCalculationType] = useState<"additive" | "inclusive">(
    payload.calculationType ?? "additive"
  );
  useEffect(() => {
    const p = (variable.payload || {}) as VariablePayloadTax;
    if (p.calculationType) setCalculationType(p.calculationType);
  }, [variable.payload]);

  const handleSaveApplication = async () => {
    try {
      const data: CreateTaxRuleData = {
        variableId: variable.id,
        conditionType: null,
        scopeType: applicationScope,
        scopeItemIds: applicationScope === "items" ? applicationItemIds : null,
        scopeCategories: applicationScope === "categories" ? applicationCategories : null,
        priority: DEFAULT_PRIORITY,
        applyToCustomAmounts,
        applyToFutureItems,
      };
      if (defaultRule) {
        await updateRule.mutateAsync({ id: String(defaultRule.id), data });
        toast.success("Tax application updated");
      } else {
        await createRule.mutateAsync(data);
        toast.success("Tax application saved");
      }
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Failed to save");
    }
  };

  const handleSaveCalculation = async () => {
    try {
      const newPayload: VariablePayloadTax = {
        ...payload,
        calculationType,
      };
      await updateVariable.mutateAsync({
        id: variableId,
        data: { payload: newPayload },
      });
      toast.success("Tax calculation saved");
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Failed to save");
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rules</p>

      <div className="space-y-4">
        <RuleCard badge="Application">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Apply tax to</Label>
              <RadioGroup
                value={applyToFutureItems ? "future" : "existing"}
                onValueChange={(v) => setApplyToFutureItems(v === "future")}
                className="space-y-2"
              >
                <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-3 has-[:checked]:border-primary">
                  <RadioGroupItem value="future" id="apply-future" />
                  <div>
                    <p className="font-medium">Current and future items</p>
                    <p className="text-sm text-muted-foreground">
                      All matching items now and any new ones added later.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-3 has-[:checked]:border-primary">
                  <RadioGroupItem value="existing" id="apply-existing" />
                  <div>
                    <p className="font-medium">Existing items only</p>
                    <p className="text-sm text-muted-foreground">
                      Only items that existed when this rule was last saved.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Taxable items</Label>
              <div className="flex gap-2 flex-wrap">
                {(["all", "items", "categories"] as const).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setApplicationScope(scope)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm shrink-0",
                      applicationScope === scope ? "border-primary bg-primary/10" : "border-border"
                    )}
                  >
                    {scope === "all" ? "All items" : scope === "items" ? "Selected items" : "Selected categories"}
                  </button>
                ))}
              </div>
              {applicationScope === "items" && (
                <ScrollArea className="h-40 rounded border p-2 mt-2">
                  <div className="flex flex-col gap-1">
                    {items.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 py-1 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={applicationItemIds.includes(item.id)}
                          onCheckedChange={(c) =>
                            setApplicationItemIds((prev) =>
                              c ? [...prev, item.id] : prev.filter((id) => id !== item.id)
                            )
                          }
                          className="shrink-0"
                        />
                        <span className="truncate">
                          {item.name}
                          {item.category && (
                            <span className="text-muted-foreground"> ({item.category})</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              )}
              {applicationScope === "categories" && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {categories.map((cat) => (
                    <label
                      key={cat}
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1.5 text-sm border cursor-pointer shrink-0",
                        applicationCategories.includes(cat) ? "border-primary bg-primary/10" : "border-border"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={applicationCategories.includes(cat)}
                        onChange={(e) =>
                          setApplicationCategories((prev) =>
                            e.target.checked ? [...prev, cat] : prev.filter((x) => x !== cat)
                          )
                        }
                        className="sr-only"
                        aria-label={cat}
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="custom-amounts" className="cursor-pointer">Apply tax to custom amounts</Label>
              <Switch
                id="custom-amounts"
                checked={applyToCustomAmounts}
                onCheckedChange={setApplyToCustomAmounts}
                className="shrink-0"
              />
            </div>
            <Button
              size="sm"
              onClick={handleSaveApplication}
              disabled={createRule.isPending || updateRule.isPending}
            >
              Save
            </Button>
          </div>
        </RuleCard>

        <RuleCard badge="Calculation">
          <div className="space-y-3">
            <RadioGroup
              value={calculationType}
              onValueChange={(v) => setCalculationType(v as "additive" | "inclusive")}
              className="space-y-3"
            >
              <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-4 has-[:checked]:border-primary">
                <span className="inline-flex size-4 shrink-0 mt-0.5 items-center justify-center">
                  <RadioGroupItem value="additive" id="calc-additive" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium">Additive tax</p>
                  <p className="text-sm text-muted-foreground">
                    Taxes are added on top of the unit price and show up as a separate line item. Most common in North America.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-4 has-[:checked]:border-primary">
                <span className="inline-flex size-4 shrink-0 mt-0.5 items-center justify-center">
                  <RadioGroupItem value="inclusive" id="calc-inclusive" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium">Inclusive tax</p>
                  <p className="text-sm text-muted-foreground">
                    Tax is included in the price. Shown on receipts but not added to total. Most common in Europe, Australia, Japan.
                  </p>
                </div>
              </label>
            </RadioGroup>
            <Button
              size="sm"
              onClick={handleSaveCalculation}
              disabled={updateVariable.isPending}
            >
              Save
            </Button>
          </div>
        </RuleCard>
      </div>
    </div>
  );
}
