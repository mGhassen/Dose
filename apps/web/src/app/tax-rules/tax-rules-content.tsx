"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useTaxRules, useDeleteTaxRule } from "@kit/hooks";
import type { TaxRule } from "@kit/types";
import { toast } from "sonner";
import { Button } from "@kit/ui/button";

function formatCondition(rule: TaxRule): string {
  if (rule.conditionType === "expense") return "Expense";
  if (rule.conditionType === "sales_type") {
    const vals = rule.conditionValues?.length
      ? rule.conditionValues
      : rule.conditionValue
        ? [rule.conditionValue]
        : [];
    return vals.length ? vals.join(", ") : "—";
  }
  return "—";
}

function formatScope(rule: TaxRule): string {
  if (rule.scopeType === "all") return "All items";
  if (rule.scopeType === "items")
    return rule.scopeItemIds?.length
      ? `${rule.scopeItemIds.length} item(s)`
      : "Selected items";
  if (rule.scopeType === "categories")
    return rule.scopeCategories?.length
      ? rule.scopeCategories.join(", ")
      : "Selected categories";
  return "—";
}

interface TaxRulesContentProps {
  selectedRuleId?: number;
}

export default function TaxRulesContent({ selectedRuleId }: TaxRulesContentProps) {
  const router = useRouter();
  const { data: rules = [], isLoading } = useTaxRules();
  const deleteMutation = useDeleteTaxRule();
  const [applyAllPending, setApplyAllPending] = useState(false);

  const handleApplyToAllItems = async () => {
    setApplyAllPending(true);
    try {
      const res = await fetch("/api/tax-rules/apply-to-items", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Applied tax rules to ${data.applied ?? 0} item(s)`);
      } else {
        toast.error(data?.error || "Failed to apply");
      }
    } catch {
      toast.error("Failed to apply tax rules to items");
    } finally {
      setApplyAllPending(false);
    }
  };

  const columns: ColumnDef<TaxRule>[] = useMemo(
    () => [
      {
        accessorKey: "variable",
        header: "Variable",
        cell: ({ row }) => {
          const v = row.original.variable;
          if (!v) return "—";
          return `${v.name} (${v.value}%)`;
        },
      },
      {
        accessorKey: "condition",
        header: "Condition",
        cell: ({ row }) => formatCondition(row.original),
      },
      {
        accessorKey: "scopeType",
        header: "Scope",
        cell: ({ row }) => formatScope(row.original),
      },
      {
        accessorKey: "ruleType",
        header: "Rule type",
        cell: ({ row }) => (
          <span className={row.original.ruleType === "exemption" ? "text-muted-foreground" : ""}>
            {row.original.ruleType === "exemption" ? "Exempt" : "Apply tax"}
          </span>
        ),
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => row.original.priority ?? 0,
      },
    ],
    []
  );

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(String(id));
      toast.success("Tax rule deleted");
      if (selectedRuleId === id) router.push("/tax-rules");
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Failed to delete");
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map((id) => deleteMutation.mutateAsync(String(id))));
      toast.success(`${ids.length} tax rule(s) deleted`);
      if (selectedRuleId !== undefined && ids.includes(selectedRuleId)) router.push("/tax-rules");
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Failed to delete");
    }
  };

  return (
    <DataTablePage
      title="Tax rules"
      description="Apply transaction tax variables to items by dining option and scope."
      createHref="/tax-rules/create"
      headerActions={
        <Button variant="outline" size="sm" onClick={handleApplyToAllItems} disabled={applyAllPending}>
          {applyAllPending ? "Applying…" : "Apply tax rules to all items"}
        </Button>
      }
      data={rules}
      columns={columns}
      loading={isLoading}
      activeRowId={selectedRuleId}
      onRowClick={(rule) => {
        if (rule.id !== selectedRuleId) router.push(`/tax-rules/${rule.id}`);
      }}
      onDelete={handleDelete}
      onBulkDelete={handleBulkDelete}
      filterColumns={[
        { value: "variable", label: "Variable" },
        { value: "condition", label: "Condition", type: "select" },
        { value: "scopeType", label: "Scope Type", type: "select" },
        { value: "ruleType", label: "Rule Type", type: "select" },
        { value: "priority", label: "Priority" },
      ]}
      sortColumns={[
        { value: "variable", label: "Variable", type: "character varying" },
        { value: "condition", label: "Condition", type: "character varying" },
        { value: "scopeType", label: "Scope Type", type: "character varying" },
        { value: "ruleType", label: "Rule Type", type: "character varying" },
        { value: "priority", label: "Priority", type: "numeric" },
      ]}
      localStoragePrefix="tax-rules"
      searchFields={[]}
    />
  );
}
