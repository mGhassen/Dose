"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { ScrollArea } from "@kit/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { StatusPin } from "@/components/status-pin";
import { Edit2, Trash2, MoreHorizontal, X } from "lucide-react";
import { useTaxRules, useDeleteVariable, useMetadataEnum } from "@kit/hooks";
import type { Variable, TaxRule } from "@kit/types";
import type { VariablePayloadTax } from "@kit/types";
import { toast } from "sonner";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</h3>
      <div className="rounded-lg border border-border/60 bg-muted/30 p-4">{children}</div>
    </section>
  );
}

export interface TaxVariableDetailProps {
  variableId: string;
  variable: Variable;
  onClose: () => void;
  onDeleted: () => void;
}

function exemptionDescription(
  r: TaxRule,
  salesTypeOptions: { id: string; name: string }[]
) {
  if (r.description) return r.description;
  const vals = r.conditionValues ?? (r.conditionValue ? [r.conditionValue] : []);
  if (vals.length > 0) {
    const labels = vals.map((v) => salesTypeOptions.find((o) => o.id === v)?.name ?? v);
    return `Exempt when dining option is ${labels.join(", ")}`;
  }
  return "No conditions";
}

export function TaxVariableDetail({ variableId, variable, onClose, onDeleted }: TaxVariableDetailProps) {
  const router = useRouter();
  const deleteMutation = useDeleteVariable();
  const { data: salesTypeValues = [] } = useMetadataEnum("SalesType");
  const salesTypeOptions = salesTypeValues.map((ev) => ({ id: ev.name, name: ev.label ?? ev.name }));
  const { data: rules = [], isLoading: rulesLoading } = useTaxRules({ variableId: variable.id });

  const payload = (variable.payload || {}) as VariablePayloadTax;
  const defaultRule = useMemo(
    () => rules.find((r) => r.conditionType === null) ?? null,
    [rules]
  );
  const exemptions = useMemo(
    () => rules.filter((r) => r.conditionType !== null),
    [rules]
  );

  const applicationScopeLabel =
    defaultRule?.scopeType === "items"
      ? "Selected items"
      : defaultRule?.scopeType === "categories"
        ? "Selected categories"
        : "All items";
  const calculationLabel =
    payload.calculationType === "inclusive" ? "Inclusive tax" : "Additive tax";

  const handleDelete = async () => {
    if (!confirm("Delete this tax? This cannot be undone.")) return;
    try {
      await deleteMutation.mutateAsync(variableId);
      toast.success("Tax deleted");
      onDeleted();
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Failed to delete");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <StatusPin active={variable.isActive} />
          <h2 className="text-lg font-semibold truncate">{variable.name}</h2>
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
              <DropdownMenuItem onClick={() => router.push(`/variables/${variableId}/edit`)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit variable
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
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

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-6 py-5 pb-8 max-w-2xl">
          <Section title="Details">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="font-medium">{variable.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tax rate</span>
                <span className="font-medium">{variable.value}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Locations</span>
                <span>All locations</span>
              </div>
            </div>
          </Section>

          <Section title="Tax application">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Taxable items</span>
                <span className="font-medium">{applicationScopeLabel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Apply to custom amounts</span>
                <span className="font-medium">{defaultRule?.applyToCustomAmounts !== false ? "Yes" : "No"}</span>
              </div>
            </div>
          </Section>

          <Section title="Tax calculation">
            <p className="font-medium">{calculationLabel}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {payload.calculationType === "inclusive"
                ? "Tax is included in the price. Shown on receipts but not added to total."
                : "Tax is added on top of unit price and shown as a separate line item."}
            </p>
          </Section>

          <Section title="Exemptions">
            {rulesLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : exemptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No exemptions</p>
            ) : (
              <div className="space-y-3">
                {exemptions.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-lg border bg-card p-4"
                  >
                    <p className="font-medium">{r.name || "Exemption"}</p>
                    <p className="text-sm text-muted-foreground">{exemptionDescription(r, salesTypeOptions)}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </ScrollArea>
    </div>
  );
}
