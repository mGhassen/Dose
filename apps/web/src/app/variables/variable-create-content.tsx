"use client";

import { useState } from "react";
import { Button } from "@kit/ui/button";
import { DatePicker } from "@kit/ui/date-picker";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { UnifiedSelector } from "@/components/unified-selector";
import { Checkbox } from "@kit/ui/checkbox";
import { ScrollArea } from "@kit/ui/scroll-area";
import { Save, X } from "lucide-react";
import { useCreateVariable, useUnits, useMetadataEnum } from "@kit/hooks";
import { toast } from "sonner";
import type { VariableType } from "@kit/types";
import { dateToYYYYMMDD } from "@kit/lib";

export interface VariableCreateContentProps {
  onClose: () => void;
  onCreated?: (id: number) => void;
}

export function VariableCreateContent({ onClose, onCreated }: VariableCreateContentProps) {
  const createVariable = useCreateVariable();
  const { data: units = [] } = useUnits();
  const { data: variableTypeValues = [], isError: variableTypeError, isLoading: variableTypeLoading } = useMetadataEnum("VariableType");
  const typeItems = variableTypeValues.map((ev) => ({ id: ev.name, name: ev.label ?? ev.name }));
  const [formData, setFormData] = useState({
    name: "",
    type: "" as VariableType | "",
    value: "",
    unitId: null as number | null,
    effectiveDate: dateToYYYYMMDD(new Date()),
    endDate: "",
    description: "",
    isActive: true,
    payloadSymbol: "",
    payloadDimension: "other",
    payloadBaseUnitId: null as number | null,
  });

  const isUnitType = formData.type === "unit";
  const isTaxOrTransactionTax = formData.type === "tax" || formData.type === "transaction_tax";
  const isTimeRelevantType = ["tax", "transaction_tax", "inflation", "exchange_rate"].includes(formData.type);
  const isRateType = ["cost", "tax", "transaction_tax", "inflation", "exchange_rate", "other"].includes(formData.type) && !isUnitType;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.type) {
      toast.error("Name and type are required");
      return;
    }
    if (formData.value === "" || isNaN(parseFloat(formData.value))) {
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
      const created = await createVariable.mutateAsync({
        name: formData.name,
        type: formData.type as VariableType,
        value: parseFloat(formData.value),
        unitId: formData.unitId ?? undefined,
        effectiveDate: isUnitType ? undefined : formData.effectiveDate || undefined,
        endDate: formData.endDate || undefined,
        description: formData.description || undefined,
        isActive: formData.isActive,
        payload,
      });
      toast.success("Variable created successfully");
      onCreated?.(created.id);
    } catch (error: any) {
      toast.error(error?.message || "Failed to create variable");
    }
  };

  const handleInputChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border pb-4">
        <h2 className="text-lg font-semibold">Create variable</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1 pr-2">
        <form onSubmit={handleSubmit} className="space-y-5 pb-6 pt-4">
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
                {variableTypeError && (
                  <p className="text-sm text-destructive">Could not load variable types. Check that VariableType is seeded in metadata enums.</p>
                )}
                <UnifiedSelector
                  type="type"
                  items={typeItems}
                  selectedId={formData.type || undefined}
                  onSelect={(item) => handleInputChange("type", item.id === 0 ? "" : String(item.id))}
                  placeholder={variableTypeLoading ? "Loading…" : "Select type"}
                  disabled={variableTypeLoading || variableTypeError}
                />
              </div>
            </div>
          </div>

          {formData.type && (
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
                      <p className="text-xs text-muted-foreground">e.g. 1000 for kg (1 kg = 1000 g)</p>
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
          )}

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
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={createVariable.isPending} className="flex-1">
              {createVariable.isPending ? "Creating…" : "Create variable"}
            </Button>
          </div>
        </form>
      </ScrollArea>
    </div>
  );
}
