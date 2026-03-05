"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { UnifiedSelector } from "@/components/unified-selector";
import { Checkbox } from "@kit/ui/checkbox";
import { Badge } from "@kit/ui/badge";
import { Separator } from "@kit/ui/separator";
import { ScrollArea } from "@kit/ui/scroll-area";
import { Skeleton } from "@kit/ui/skeleton";
import { Edit2, Trash2, MoreHorizontal, X, Hash, Calendar, Tag, FileText } from "lucide-react";
import { useVariableById, useUpdateVariable, useDeleteVariable, useUnits } from "@kit/hooks";
import { toast } from "sonner";
import { formatDate } from "@kit/lib/date-format";
import { dateToYYYYMMDD } from "@kit/lib";
import type { VariableType } from "@kit/types";
import { DatePicker } from "@kit/ui/date-picker";

const TYPE_ITEMS = [
  { id: "cost", name: "Cost" },
  { id: "tax", name: "Tax" },
  { id: "transaction_tax", name: "Transaction tax" },
  { id: "inflation", name: "Inflation" },
  { id: "exchange_rate", name: "Exchange Rate" },
  { id: "unit", name: "Unit" },
  { id: "other", name: "Other" },
];

const TYPE_LABELS: Record<string, string> = {
  cost: "Cost",
  tax: "Tax",
  transaction_tax: "Transaction tax",
  inflation: "Inflation",
  exchange_rate: "Exchange Rate",
  unit: "Unit",
  other: "Other",
};

const LABEL_MIN_WIDTH = "7.5rem";

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <p className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground" style={{ minWidth: LABEL_MIN_WIDTH }}>
          {label}
        </p>
        <div className="min-w-0 flex-1 text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}

export interface VariableDetailContentProps {
  variableId: string;
  initialEditMode?: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function VariableDetailContent({
  variableId,
  initialEditMode = false,
  onClose,
  onDeleted,
}: VariableDetailContentProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const { data: variable, isLoading } = useVariableById(variableId);
  const updateVariable = useUpdateVariable();
  const deleteMutation = useDeleteVariable();

  const [formData, setFormData] = useState({
    name: "",
    type: "" as VariableType | "",
    value: "",
    unitId: null as number | null,
    effectiveDate: "",
    endDate: "",
    description: "",
    isActive: true,
    payloadSymbol: "",
    payloadDimension: "other",
    payloadBaseUnitId: null as number | null,
  });
  const { data: units = [] } = useUnits();

  const isUnitType = formData.type === "unit";
  const isTaxOrTransactionTax = formData.type === "tax" || formData.type === "transaction_tax";
  const isTimeRelevantType = ["tax", "transaction_tax", "inflation", "exchange_rate"].includes(formData.type);
  const isRateType = ["cost", "tax", "transaction_tax", "inflation", "exchange_rate", "other"].includes(formData.type) && !isUnitType;

  useEffect(() => {
    if (variable) {
      const payload = variable.payload as { symbol?: string; dimension?: string; base_unit_id?: number | null } | undefined;
      setFormData({
        name: variable.name,
        type: variable.type,
        value: variable.value.toString(),
        unitId: variable.unitId ?? null,
        effectiveDate: variable.effectiveDate ? variable.effectiveDate.split("T")[0] : "",
        endDate: variable.endDate ? variable.endDate.split("T")[0] : "",
        description: variable.description || "",
        isActive: variable.isActive,
        payloadSymbol: payload?.symbol ?? "",
        payloadDimension: payload?.dimension ?? "other",
        payloadBaseUnitId: payload?.base_unit_id ?? null,
      });
    }
  }, [variable]);

  useEffect(() => {
    setIsEditing(initialEditMode);
  }, [initialEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.type) {
      toast.error("Name and type are required");
      return;
    }
    const numValue = parseFloat(formData.value);
    if (formData.value === "" || isNaN(numValue)) {
      toast.error("Value is required and must be a number");
      return;
    }
    if (isUnitType && !formData.payloadSymbol?.trim()) {
      toast.error("Symbol is required for unit type");
      return;
    }
    if (isTimeRelevantType && !formData.effectiveDate) {
      toast.error("Effective date is required for this variable type");
      return;
    }
    const payload = isUnitType
      ? {
          symbol: formData.payloadSymbol.trim(),
          dimension: formData.payloadDimension || "other",
          base_unit_id: formData.payloadBaseUnitId ?? null,
        }
      : undefined;
    try {
      await updateVariable.mutateAsync({
        id: variableId,
        data: {
          name: formData.name.trim(),
          type: formData.type as VariableType,
          value: numValue,
          unitId: formData.unitId ?? undefined,
          effectiveDate: isUnitType ? undefined : formData.effectiveDate || undefined,
          endDate: formData.endDate?.trim() || undefined,
          description: formData.description?.trim() || undefined,
          isActive: formData.isActive,
          payload,
        },
      });
      toast.success("Variable updated successfully");
      router.push(`/variables/${variableId}`);
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update variable");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this variable? This action cannot be undone.")) return;
    try {
      await deleteMutation.mutateAsync(variableId);
      toast.success("Variable deleted successfully");
      onDeleted();
    } catch (error) {
      toast.error("Failed to delete variable");
      console.error(error);
    }
  };

  const handleInputChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="space-y-4 px-1">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Separator />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!variable) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Variable not found</h2>
          <p className="text-sm text-muted-foreground">It may have been deleted or doesn't exist.</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Back to variables
        </Button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-border pb-4">
          <h2 className="text-lg font-semibold">Edit variable</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="min-h-0 flex-1 pr-2">
            <div className="space-y-5 pb-6 pt-4">
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Basic</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder={isUnitType ? "e.g., Kilogram" : "e.g., VAT Rate"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <UnifiedSelector
                      type="type"
                      items={TYPE_ITEMS}
                      selectedId={formData.type || undefined}
                      onSelect={(item) => handleInputChange("type", item.id === 0 ? "" : String(item.id))}
                      placeholder="Select type"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {isUnitType ? "Unit details" : isTaxOrTransactionTax ? "Rate & period" : "Value & period"}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {isUnitType ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="payloadSymbol">Symbol *</Label>
                        <Input
                          id="payloadSymbol"
                          value={formData.payloadSymbol}
                          onChange={(e) => handleInputChange("payloadSymbol", e.target.value)}
                          placeholder="e.g., g, kg, L"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="payloadDimension">Dimension</Label>
                        <Input
                          id="payloadDimension"
                          value={formData.payloadDimension}
                          onChange={(e) => handleInputChange("payloadDimension", e.target.value)}
                          placeholder="mass, volume, count, other"
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="value">Factor to base *</Label>
                        <Input
                          id="value"
                          type="number"
                          step="0.0001"
                          value={formData.value}
                          onChange={(e) => handleInputChange("value", e.target.value)}
                          placeholder="1"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="value">Value *</Label>
                        <Input
                          id="value"
                          type="number"
                          step="0.01"
                          value={formData.value}
                          onChange={(e) => handleInputChange("value", e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <UnifiedSelector
                          type="unit"
                          items={units.map((u) => ({ id: u.id, name: u.symbol || u.name }))}
                          selectedId={formData.unitId ?? undefined}
                          onSelect={(item) => handleInputChange("unitId", typeof item.id === "number" ? item.id : null)}
                          placeholder={isTaxOrTransactionTax ? "e.g. percentage" : "Select unit"}
                        />
                      </div>
                      {(isTimeRelevantType || isRateType) && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="effectiveDate">{isTimeRelevantType ? "Effective date *" : "Effective date"}</Label>
                            <DatePicker
                              id="effectiveDate"
                              value={formData.effectiveDate ? new Date(formData.effectiveDate) : undefined}
                              onChange={(d) => handleInputChange("effectiveDate", d ? dateToYYYYMMDD(d) : "")}
                              placeholder="Pick a date"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="endDate">End date</Label>
                            <DatePicker
                              id="endDate"
                              value={formData.endDate ? new Date(formData.endDate) : undefined}
                              onChange={(d) => handleInputChange("endDate", d ? dateToYYYYMMDD(d) : "")}
                              placeholder="Optional"
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Optional</p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Additional notes"
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(c) => handleInputChange("isActive", c === true)}
                    />
                    <Label htmlFor="isActive" className="cursor-pointer font-normal">Active</Label>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          <div className="mt-auto flex shrink-0 gap-3 border-t border-border bg-background p-4 -mx-6">
            <Button type="button" variant="outline" onClick={() => router.push(`/variables/${variableId}`)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={updateVariable.isPending} className="flex-1">
              {updateVariable.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  const isUnitTypeView = variable.type === "unit";
  const isTaxOrTransactionTaxView = variable.type === "tax" || variable.type === "transaction_tax";
  const isTimeRelevantView = ["tax", "transaction_tax", "inflation", "exchange_rate"].includes(variable.type);
  const isRateTypeView = ["cost", "tax", "transaction_tax", "inflation", "exchange_rate", "other"].includes(variable.type);
  const payloadView = variable.payload as { symbol?: string; dimension?: string } | undefined;

  const showDateRange = !isUnitTypeView && (isTimeRelevantView || isRateTypeView);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-xs text-muted-foreground">{TYPE_LABELS[variable.type] || variable.type}</p>
          <h2 className="text-lg font-semibold">{variable.name}</h2>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/variables/${variableId}/edit`)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit variable
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-0 pt-4 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Hash className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tracking-tight tabular-nums">
                {isUnitTypeView
                  ? (payloadView?.symbol ? `${variable.value} ${payloadView.symbol}` : variable.value)
                  : variable.unit === "percentage"
                    ? `${variable.value}%`
                    : `${variable.value} ${variable.unit || ""}`.trim() || String(variable.value)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-normal">
                  {TYPE_LABELS[variable.type] || variable.type}
                </Badge>
                {showDateRange && variable.effectiveDate && (
                  <span className="text-sm text-muted-foreground">{formatDate(variable.effectiveDate)}</span>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground pl-[calc(2.25rem+0.75rem+7.5rem+1rem)]">Basic</p>
          <DetailRow icon={Tag} label="Type">
            <Badge variant="outline">{TYPE_LABELS[variable.type] || variable.type}</Badge>
          </DetailRow>

          <Separator className="my-3" />
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground pl-[calc(2.25rem+0.75rem+7.5rem+1rem)]">
            {isUnitTypeView ? "Unit details" : isTaxOrTransactionTaxView ? "Rate & period" : "Value & period"}
          </p>
          {isUnitTypeView ? (
            <>
              <DetailRow icon={Hash} label="Factor to base">
                {variable.value.toString()}
              </DetailRow>
              {payloadView && (
                <>
                  <Separator />
                  <DetailRow icon={Tag} label="Symbol">
                    {payloadView.symbol ?? "—"}
                  </DetailRow>
                  <Separator />
                  <DetailRow icon={Tag} label="Dimension">
                    {payloadView.dimension ?? "—"}
                  </DetailRow>
                </>
              )}
            </>
          ) : (
            <>
              <DetailRow icon={Hash} label="Value">
                {variable.unit ? `${variable.value} ${variable.unit === "percentage" ? "%" : variable.unit}` : variable.value.toString()}
              </DetailRow>
              {variable.unit && (
                <>
                  <Separator />
                  <DetailRow icon={Tag} label="Unit">
                    {variable.unit}
                  </DetailRow>
                </>
              )}
              {showDateRange && (
                <>
                  <Separator />
                  <DetailRow icon={Calendar} label="Effective date">
                    {variable.effectiveDate ? formatDate(variable.effectiveDate) : <span className="text-muted-foreground">—</span>}
                  </DetailRow>
                  <Separator />
                  <DetailRow icon={Calendar} label="End date">
                    {variable.endDate ? formatDate(variable.endDate) : <span className="text-muted-foreground">—</span>}
                  </DetailRow>
                </>
              )}
            </>
          )}

          <Separator className="my-3" />
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground pl-[calc(2.25rem+0.75rem+7.5rem+1rem)]">Optional</p>
          <DetailRow icon={Tag} label="Status">
            <Badge variant={variable.isActive ? "default" : "secondary"}>
              {variable.isActive ? "Active" : "Inactive"}
            </Badge>
          </DetailRow>
          {variable.description && (
            <>
              <Separator />
              <DetailRow icon={FileText} label="Description">
                <p className="whitespace-pre-wrap text-foreground/90">{variable.description}</p>
              </DetailRow>
            </>
          )}

          <Separator className="my-4" />
          <div className="flex gap-6 text-xs text-muted-foreground pt-2">
            <span>Created {formatDate(variable.createdAt)}</span>
            <span>Updated {formatDate(variable.updatedAt)}</span>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
