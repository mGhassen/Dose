"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { Label } from "@kit/ui/label";
import { RadioGroup, RadioGroupItem } from "@kit/ui/radio-group";
import { Checkbox } from "@kit/ui/checkbox";
import { ScrollArea } from "@kit/ui/scroll-area";
import { Skeleton } from "@kit/ui/skeleton";
import { Edit2, Trash2, MoreHorizontal, X } from "lucide-react";
import {
  useTaxRuleById,
  useUpdateTaxRule,
  useDeleteTaxRule,
  useVariablesByType,
  useMetadataEnum,
  useItems,
} from "@kit/hooks";
import type { TaxRule, CreateTaxRuleData } from "@kit/types";
import type { Item } from "@kit/types";
import { toast } from "sonner";
import { formatDate } from "@kit/lib/date-format";
import { cn } from "@kit/lib/utils";
import { UnifiedSelector } from "@/components/unified-selector";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right min-w-0">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</h3>
      <div className="rounded-lg border border-border/60 bg-muted/30 p-4">{children}</div>
    </section>
  );
}

export interface TaxRuleDetailContentProps {
  ruleId: string;
  initialEditMode?: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function TaxRuleDetailContent({
  ruleId,
  initialEditMode = false,
  onClose,
  onDeleted,
}: TaxRuleDetailContentProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setIsEditing(initialEditMode);
  }, [initialEditMode]);

  const { data: rule, isLoading, isError } = useTaxRuleById(ruleId);
  const updateRule = useUpdateTaxRule();
  const deleteRule = useDeleteTaxRule();
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
  const salesTypeLabels: Record<string, string> = useMemo(
    () => Object.fromEntries(salesTypeValues.map((ev) => [ev.name, ev.label ?? ev.name])),
    [salesTypeValues]
  );

  useEffect(() => {
    if (!rule) return;
    setVariableId(rule.variableId);
    setConditionType(rule.conditionType === "expense" ? "expense" : "sales_type");
    setConditionValues(
      rule.conditionValues?.length
        ? rule.conditionValues
        : rule.conditionValue
          ? [rule.conditionValue]
          : []
    );
    setScopeType(rule.scopeType ?? "all");
    setScopeItemIds(rule.scopeItemIds ?? []);
    setScopeCategories(rule.scopeCategories ?? []);
    setRuleType(rule.ruleType ?? "taxable");
    const varPayload = rule.variable?.payload as { calculationType?: string } | undefined;
    setCalculationType(
      (rule.calculationType as "additive" | "inclusive") ?? (varPayload?.calculationType as "additive" | "inclusive") ?? "additive"
    );
    setPriority(rule.priority ?? 0);
    setApplyToCustomAmounts(rule.applyToCustomAmounts ?? true);
    setApplyToFutureItems(rule.applyToFutureItems ?? true);
  }, [rule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rule || variableId == null) return;
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
      await updateRule.mutateAsync({ id: ruleId, data });
      toast.success("Tax rule updated");
      router.push(`/tax-rules/${ruleId}`);
      setIsEditing(false);
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to update");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRule.mutateAsync(ruleId);
      toast.success("Tax rule deleted");
      setShowDeleteConfirm(false);
      onDeleted();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to delete");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-border pb-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-8" />
        </div>
        <div className="space-y-4 pt-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!rule || isError) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">Tax rule not found.</p>
        <Button variant="outline" onClick={onClose}>
          Back to tax rules
        </Button>
      </div>
    );
  }

  const conditionDisplay =
    rule.conditionType === "expense"
      ? "Expense"
      : rule.conditionType === "sales_type"
        ? (rule.conditionValues?.length
            ? rule.conditionValues.map((v) => salesTypeLabels[v] ?? v).join(", ")
            : rule.conditionValue
              ? salesTypeLabels[rule.conditionValue] ?? rule.conditionValue
              : "—")
        : "—";
  const scopeDisplay =
    rule.scopeType === "all"
      ? "All items"
      : rule.scopeType === "items"
        ? rule.scopeItemIds?.length
          ? `${rule.scopeItemIds.length} item(s)`
          : "Selected items"
        : rule.scopeType === "categories"
          ? rule.scopeCategories?.join(", ") ?? "Selected categories"
          : "—";
  const variableDisplay = rule.variable ? `${rule.variable.name} (${rule.variable.value}%)` : "—";

  if (isEditing) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-border pb-4">
          <h2 className="text-lg font-semibold">Edit tax rule</h2>
          <Button variant="ghost" size="icon" onClick={() => router.push(`/tax-rules/${ruleId}`)} aria-label="Close">
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
            <Button type="button" variant="outline" onClick={() => router.push(`/tax-rules/${ruleId}`)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={updateRule.isPending} className="flex-1">
              {updateRule.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold truncate">{variableDisplay}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{conditionDisplay}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/tax-rules/${ruleId}/edit`)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-6 pt-5 pb-6">
          <Section title="Rule">
            <KeyValue label="Transaction tax (variable)" value={variableDisplay} />
            <KeyValue label="Condition" value={conditionDisplay} />
            <KeyValue label="Rule type" value={rule.ruleType === "exemption" ? "Exempt (0%)" : "Apply tax (variable rate)"} />
            <KeyValue
              label="Tax calculation"
              value={
                (rule.calculationType ?? (rule.variable?.payload as { calculationType?: string } | undefined)?.calculationType) === "inclusive"
                  ? "Inclusive tax"
                  : "Additive tax"
              }
            />
            <KeyValue label="Priority" value={rule.priority ?? 0} />
          </Section>
          <Section title="Scope">
            <KeyValue label="Scope" value={scopeDisplay} />
            <KeyValue label="Apply to future items" value={rule.applyToFutureItems !== false ? "Yes" : "No"} />
            <KeyValue label="Apply to custom amounts" value={rule.applyToCustomAmounts !== false ? "Yes" : "No"} />
          </Section>
          <div className="flex gap-6 text-xs text-muted-foreground pt-1">
            <span>Created {formatDate(rule.createdAt)}</span>
            <span>Updated {formatDate(rule.updatedAt)}</span>
          </div>
        </div>
      </ScrollArea>

      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete tax rule"
        description="This rule will no longer apply. This cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isPending={deleteRule.isPending}
      />
    </div>
  );
}
