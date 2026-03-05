"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kit/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@kit/ui/dialog";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { useVariables, useTaxRules, useCreateTaxRule, useUpdateTaxRule, useDeleteTaxRule } from "@kit/hooks";
import type { TaxRule, Variable, CreateTaxRuleData } from "@kit/types";
import type { TaxRuleConditionType, TaxRuleScopeType } from "@kit/types";
import AppLayout from "@/components/app-layout";
import { UnifiedSelector } from "@/components/unified-selector";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CONDITION_TYPES: { id: TaxRuleConditionType; name: string }[] = [
  { id: "sales_type", name: "Dining option" },
  { id: "expense", name: "Expense" },
  { id: null, name: "Always" },
];

const SALES_TYPE_OPTIONS = [
  { id: "on_site", name: "On site" },
  { id: "delivery", name: "Delivery" },
  { id: "takeaway", name: "Takeaway" },
  { id: "catering", name: "Catering" },
  { id: "other", name: "Other" },
];

const SCOPE_TYPES: { id: TaxRuleScopeType; name: string }[] = [
  { id: "all", name: "All items" },
  { id: "items", name: "Selected items" },
  { id: "categories", name: "Selected categories" },
];

export default function TaxesSettingsPage() {
  const router = useRouter();
  const { data: variablesData } = useVariables();
  const variables = variablesData ?? [];
  const taxVariables = useMemo(
    () => variables.filter((v: Variable) => v.type === "tax" || v.type === "transaction_tax"),
    [variables]
  );

  const { data: rules = [], isLoading: rulesLoading } = useTaxRules();
  const createRule = useCreateTaxRule();
  const updateRule = useUpdateTaxRule();
  const deleteRule = useDeleteTaxRule();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TaxRule | null>(null);
  const [form, setForm] = useState<CreateTaxRuleData & { scopeItemIdsStr?: string; scopeCategoriesStr?: string }>({
    variableId: 0,
    conditionType: "sales_type",
    conditionValue: "",
    scopeType: "all",
    scopeItemIds: null,
    scopeCategories: null,
    priority: 0,
    scopeItemIdsStr: "",
    scopeCategoriesStr: "",
  });

  const openCreate = () => {
    setEditingRule(null);
    setForm({
      variableId: 0,
      conditionType: "sales_type",
      conditionValue: "on_site",
      scopeType: "all",
      scopeItemIds: null,
      scopeCategories: null,
      priority: 0,
      scopeItemIdsStr: "",
      scopeCategoriesStr: "",
    });
    setModalOpen(true);
  };

  const openEdit = (rule: TaxRule) => {
    setEditingRule(rule);
    setForm({
      variableId: rule.variableId,
      conditionType: rule.conditionType ?? undefined,
      conditionValue: rule.conditionValue ?? undefined,
      scopeType: rule.scopeType ?? "all",
      scopeItemIds: rule.scopeItemIds ?? null,
      scopeCategories: rule.scopeCategories ?? null,
      priority: rule.priority ?? 0,
      scopeItemIdsStr: (rule.scopeItemIds ?? []).join(", "),
      scopeCategoriesStr: (rule.scopeCategories ?? []).join(", "),
    });
    setModalOpen(true);
  };

  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const variableId = form.variableId;
    if (!variableId) {
      toast.error("Select a tax rate");
      return;
    }
    let scopeItemIds: number[] | null = null;
    let scopeCategories: string[] | null = null;
    if (form.scopeType === "items" && form.scopeItemIdsStr?.trim()) {
      scopeItemIds = form.scopeItemIdsStr
        .split(/[\s,]+/)
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));
    }
    if (form.scopeType === "categories" && form.scopeCategoriesStr?.trim()) {
      scopeCategories = form.scopeCategoriesStr.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    }

    const payload: CreateTaxRuleData = {
      variableId,
      conditionType: form.conditionType ?? undefined,
      conditionValue: form.conditionType === "sales_type" ? form.conditionValue || undefined : undefined,
      scopeType: form.scopeType ?? "all",
      scopeItemIds: scopeItemIds?.length ? scopeItemIds : null,
      scopeCategories: scopeCategories?.length ? scopeCategories : null,
      priority: form.priority ?? 0,
    };

    try {
      if (editingRule) {
        await updateRule.mutateAsync({ id: String(editingRule.id), data: payload });
        toast.success("Rule updated");
      } else {
        await createRule.mutateAsync(payload);
        toast.success("Rule created");
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save rule");
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm("Delete this tax rule?")) return;
    try {
      await deleteRule.mutateAsync(String(id));
      toast.success("Rule deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete rule");
    }
  };

  const ruleConditionLabel = (r: TaxRule) => {
    if (r.conditionType === "sales_type" && r.conditionValue) {
      const opt = SALES_TYPE_OPTIONS.find((o) => o.id === r.conditionValue);
      return `Dining: ${opt?.name ?? r.conditionValue}`;
    }
    if (r.conditionType === "expense") return "Expense";
    return "Always";
  };

  const ruleScopeLabel = (r: TaxRule) => {
    if (r.scopeType === "all") return "All";
    if (r.scopeType === "items" && r.scopeItemIds?.length) return `${r.scopeItemIds.length} item(s)`;
    if (r.scopeType === "categories" && r.scopeCategories?.length) return r.scopeCategories.join(", ");
    return r.scopeType;
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Taxes</h1>
          <p className="text-muted-foreground mt-2">
            Manage tax rates (variables) and rules that define when and where each tax applies.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tax rates</CardTitle>
            <CardDescription>
              Variables of type Tax or Transaction tax. Create and edit them in Variables, then add rules below.
            </CardDescription>
            <div className="pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/variables/create?type=tax">Create tax rate</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="ml-2">
                <Link href="/variables">View all variables</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {taxVariables.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tax variables yet. Create one in Variables (type: Tax or Transaction tax).</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxVariables.map((v: Variable) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>{v.unit === "percentage" ? `${v.value}%` : v.value}</TableCell>
                      <TableCell>{v.type === "transaction_tax" ? "Transaction tax" : "Tax"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/variables/${v.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tax rules</CardTitle>
            <CardDescription>
              When to apply which tax and to what (dining option, expense; all items or selected items/categories).
            </CardDescription>
            <div className="pt-2">
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add rule
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {rulesLoading ? (
              <p className="text-sm text-muted-foreground">Loading rules…</p>
            ) : rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rules yet. Add a rule to apply a tax under conditions.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tax</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Applies to</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {(r as TaxRule & { variable?: { name?: string } }).variable?.name ?? `Variable ${r.variableId}`}
                      </TableCell>
                      <TableCell>{ruleConditionLabel(r)}</TableCell>
                      <TableCell>{ruleScopeLabel(r)}</TableCell>
                      <TableCell>{r.priority}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(r.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit rule" : "Add rule"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitRule} className="space-y-4">
            <div className="space-y-2">
              <Label>Tax rate (variable)</Label>
              <UnifiedSelector
                type="type"
                items={taxVariables.map((v) => ({ id: v.id, name: `${v.name} (${v.value}%)` }))}
                selectedId={form.variableId || undefined}
                onSelect={(item) => setForm((p) => ({ ...p, variableId: item.id as number }))}
                placeholder="Select tax rate"
              />
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <UnifiedSelector
                type="type"
                items={CONDITION_TYPES.map((c) => ({ id: c.id ?? "always", name: c.name }))}
                selectedId={form.conditionType === null ? "always" : (form.conditionType ?? undefined)}
                onSelect={(item) =>
                  setForm((p) => ({
                    ...p,
                    conditionType: item.id === "always" ? null : (item.id as TaxRuleConditionType),
                    conditionValue: item.id === "sales_type" ? "on_site" : undefined,
                  }))
                }
                placeholder="When"
              />
            </div>
            {form.conditionType === "sales_type" && (
              <div className="space-y-2">
                <Label>Dining option</Label>
                <UnifiedSelector
                  type="type"
                  items={SALES_TYPE_OPTIONS}
                  selectedId={form.conditionValue || undefined}
                  onSelect={(item) => setForm((p) => ({ ...p, conditionValue: String(item.id) }))}
                  placeholder="Select"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Applies to</Label>
              <UnifiedSelector
                type="type"
                items={SCOPE_TYPES}
                selectedId={form.scopeType || undefined}
                onSelect={(item) => setForm((p) => ({ ...p, scopeType: item.id as TaxRuleScopeType }))}
                placeholder="Scope"
              />
            </div>
            {form.scopeType === "items" && (
              <div className="space-y-2">
                <Label>Item IDs (comma-separated)</Label>
                <Input
                  value={form.scopeItemIdsStr ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, scopeItemIdsStr: e.target.value }))}
                  placeholder="e.g. 1, 2, 3"
                />
              </div>
            )}
            {form.scopeType === "categories" && (
              <div className="space-y-2">
                <Label>Categories (comma-separated)</Label>
                <Input
                  value={form.scopeCategoriesStr ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, scopeCategoriesStr: e.target.value }))}
                  placeholder="e.g. beverages, food"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Priority (lower = higher)</Label>
              <Input
                type="number"
                value={form.priority ?? 0}
                onChange={(e) => setForm((p) => ({ ...p, priority: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRule.isPending || updateRule.isPending}>
                {editingRule ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
