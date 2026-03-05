"use client";

import { useMemo, useState, useEffect } from "react";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Switch } from "@kit/ui/switch";
import { RadioGroup, RadioGroupItem } from "@kit/ui/radio-group";
import { Checkbox } from "@kit/ui/checkbox";
import { ScrollArea } from "@kit/ui/scroll-area";
import {
  useTaxRules,
  useCreateTaxRule,
  useUpdateTaxRule,
  useDeleteTaxRule,
  useUpdateVariable,
  useItems,
  useMetadataEnum,
} from "@kit/hooks";
import type { Variable, TaxRule, CreateTaxRuleData } from "@kit/types";
import type { VariablePayloadTax } from "@kit/types";
import type { Item } from "@kit/types";
import { toast } from "sonner";
import { cn } from "@kit/lib/utils";
import { Edit2, Trash2, Percent, Ban } from "lucide-react";

const DEFAULT_PRIORITY = 999;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</h3>
      <div className="rounded-lg border border-border/60 bg-muted/30 p-4">{children}</div>
    </section>
  );
}

export interface TaxVariableEditSectionProps {
  variableId: string;
  variable: Variable;
}

export function TaxVariableEditSection({ variableId, variable }: TaxVariableEditSectionProps) {
  const payload = (variable.payload || {}) as VariablePayloadTax;
  const { data: salesTypeValues = [] } = useMetadataEnum("SalesType");
  const salesTypeOptions = salesTypeValues.map((ev) => ({ id: ev.name, name: ev.label ?? ev.name }));
  const { data: rules = [], isLoading: rulesLoading } = useTaxRules({ variableId: variable.id });
  const createRule = useCreateTaxRule();
  const updateRule = useUpdateTaxRule();
  const deleteRule = useDeleteTaxRule();
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
  const exemptions = useMemo(
    () => rules.filter((r) => r.conditionType !== null),
    [rules]
  );

  const [applicationScope, setApplicationScope] = useState<"all" | "items" | "categories">("all");
  const [applicationItemIds, setApplicationItemIds] = useState<number[]>([]);
  const [applicationCategories, setApplicationCategories] = useState<string[]>([]);
  const [applyToCustomAmounts, setApplyToCustomAmounts] = useState(true);

  useEffect(() => {
    if (defaultRule) {
      setApplicationScope(defaultRule.scopeType ?? "all");
      setApplicationItemIds(defaultRule.scopeItemIds ?? []);
      setApplicationCategories(defaultRule.scopeCategories ?? []);
      setApplyToCustomAmounts(defaultRule.applyToCustomAmounts ?? true);
    }
  }, [defaultRule?.id, defaultRule?.scopeType, defaultRule?.scopeItemIds, defaultRule?.scopeCategories, defaultRule?.applyToCustomAmounts]);

  const [calculationType, setCalculationType] = useState<"additive" | "inclusive">(
    payload.calculationType ?? "additive"
  );
  useEffect(() => {
    const p = (variable.payload || {}) as VariablePayloadTax;
    if (p.calculationType) setCalculationType(p.calculationType);
  }, [variable.payload]);

  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [editingRuleForm, setEditingRuleForm] = useState<{
    name: string;
    ruleType: "exemption" | "reduction";
    conditionValues: string[];
  } | null>(null);

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

  const openEditRule = (rule: TaxRule | null) => {
    if (rule) {
      setEditingRuleId(rule.id);
      setEditingRuleForm({
        name: rule.name ?? "",
        ruleType: rule.ruleType ?? "exemption",
        conditionValues: rule.conditionValues ?? (rule.conditionValue ? [rule.conditionValue] : []),
      });
    } else {
      setEditingRuleId(null);
      setEditingRuleForm({
        name: "",
        ruleType: "exemption",
        conditionValues: [],
      });
    }
  };

  const handleSaveExemptionRule = async () => {
    if (!editingRuleForm) return;
    try {
      const data: CreateTaxRuleData = {
        variableId: variable.id,
        conditionType: "sales_type",
        conditionValue: editingRuleForm.conditionValues[0] ?? null,
        conditionValues:
          editingRuleForm.conditionValues.length > 0 ? editingRuleForm.conditionValues : null,
        scopeType: "all",
        priority: 0,
        name: editingRuleForm.name.trim() || null,
        description:
          editingRuleForm.conditionValues.length > 0
            ? `Exempt when dining option is ${editingRuleForm.conditionValues.join(", ")}`
            : null,
        ruleType: editingRuleForm.ruleType,
      };
      if (editingRuleId) {
        await updateRule.mutateAsync({ id: String(editingRuleId), data });
        toast.success("Rule updated");
      } else {
        await createRule.mutateAsync(data);
        toast.success("Exemption added");
      }
      setEditingRuleForm(null);
      setEditingRuleId(null);
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Failed to save rule");
    }
  };

  const exemptionDescription = (r: TaxRule) => {
    if (r.description) return r.description;
    const vals = r.conditionValues ?? (r.conditionValue ? [r.conditionValue] : []);
    if (vals.length > 0) {
      const labels = vals.map((v) => salesTypeOptions.find((o) => o.id === v)?.name ?? v);
      return `Exempt when dining option is ${labels.join(", ")}`;
    }
    return "No conditions";
  };

  return (
    <div className="space-y-6">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tax rules</p>

      <Section title="Tax application">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Apply tax to</Label>
            <p className="text-sm text-muted-foreground">
              All current and future taxable items at selected locations
            </p>
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
                      "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border cursor-pointer shrink-0",
                      applicationCategories.includes(cat) ? "border-primary bg-primary/10" : "border-border"
                    )}
                  >
                    <Checkbox
                      checked={applicationCategories.includes(cat)}
                      onCheckedChange={(c) =>
                        setApplicationCategories((prev) =>
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
            Save application
          </Button>
        </div>
      </Section>

      <Section title="Tax calculation">
        <RadioGroup
          value={calculationType}
          onValueChange={(v) => setCalculationType(v as "additive" | "inclusive")}
          className="space-y-3"
        >
          <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-4 has-[:checked]:border-primary">
            <RadioGroupItem value="additive" id="calc-additive" className="shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-medium">Additive tax</p>
              <p className="text-sm text-muted-foreground">
                Taxes are added on top of the unit price and show up as a separate line item. Most common in North America.
              </p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-4 has-[:checked]:border-primary">
            <RadioGroupItem value="inclusive" id="calc-inclusive" className="shrink-0 mt-0.5" />
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
          className="mt-3"
          onClick={handleSaveCalculation}
          disabled={updateVariable.isPending}
        >
          Save calculation
        </Button>
      </Section>

      <Section title="Exemptions">
        {rulesLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-3">
            {exemptions.map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-2 rounded-lg border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">{r.name || "Exemption"}</p>
                  <p className="text-sm text-muted-foreground">{exemptionDescription(r)}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditRule(r)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={async () => {
                      if (!confirm("Remove this exemption?")) return;
                      try {
                        await deleteRule.mutateAsync(String(r.id));
                        toast.success("Exemption removed");
                      } catch (e: unknown) {
                        toast.error((e as Error)?.message || "Failed to remove");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {editingRuleForm !== null ? (
              <div className="rounded-lg border border-primary/30 bg-muted/30 p-4 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Create a rule with conditions. The rule applies when all conditions are met.
                </p>
                <div className="space-y-2">
                  <Label>Tax rule name</Label>
                  <Input
                    value={editingRuleForm.name}
                    onChange={(e) =>
                      setEditingRuleForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="e.g. TVA sur place"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rule type</Label>
                  <RadioGroup
                    value={editingRuleForm.ruleType}
                    onValueChange={(v) =>
                      setEditingRuleForm((p) => ({ ...p, ruleType: v as "exemption" | "reduction" }))
                    }
                    className="flex flex-wrap gap-4"
                  >
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="exemption" id="rule-exemption" className="shrink-0" />
                      <Ban className="h-4 w-4 shrink-0" />
                      <span>Tax exemption</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="reduction" id="rule-reduction" className="shrink-0" />
                      <Percent className="h-4 w-4 shrink-0" />
                      <span>Tax reduction</span>
                    </label>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>When dining option is</Label>
                  <div className="flex flex-wrap gap-2">
                    {salesTypeOptions.map((opt) => (
                      <label
                        key={opt.id}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border cursor-pointer shrink-0",
                          editingRuleForm.conditionValues.includes(opt.id)
                            ? "border-primary bg-primary/10"
                            : "border-border"
                        )}
                      >
                        <Checkbox
                          checked={editingRuleForm.conditionValues.includes(opt.id)}
                          onCheckedChange={(c) =>
                            setEditingRuleForm((p) => ({
                              ...p,
                              conditionValues:
                                c === true
                                  ? [...p.conditionValues, opt.id]
                                  : p.conditionValues.filter((x) => x !== opt.id),
                            }))
                          }
                          className="sr-only"
                        />
                        {opt.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveExemptionRule}>
                    {editingRuleId ? "Update rule" : "Create rule"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingRuleForm(null);
                      setEditingRuleId(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => openEditRule(null)}>
                + Add exemption
              </Button>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
