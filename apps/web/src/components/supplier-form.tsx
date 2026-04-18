"use client";

import { useMemo } from "react";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Checkbox } from "@kit/ui/checkbox";
import { UnifiedSelector } from "@/components/unified-selector";
import { useMetadataEnum } from "@kit/hooks";

export interface SupplierFormValues {
  name: string;
  email: string;
  phone: string;
  contactPerson: string;
  paymentTerms: string;
  address: string;
  notes: string;
  supplierType: string[];
  isActive: boolean;
}

export const emptySupplierFormValues: SupplierFormValues = {
  name: "",
  email: "",
  phone: "",
  contactPerson: "",
  paymentTerms: "",
  address: "",
  notes: "",
  supplierType: ["supplier"],
  isActive: true,
};

export interface SupplierFormProps {
  value: SupplierFormValues;
  onChange: (patch: Partial<SupplierFormValues>) => void;
  idPrefix?: string;
}

export function SupplierForm({ value, onChange, idPrefix = "supplier" }: SupplierFormProps) {
  const { data: paymentTermsValues = [] } = useMetadataEnum("SupplierPaymentTerms");
  const { data: supplierTypeValues = [] } = useMetadataEnum("SupplierType");

  const paymentTermsItems = useMemo(
    () => paymentTermsValues.map((ev) => ({ id: ev.name, name: ev.label ?? ev.name })),
    [paymentTermsValues]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor={`${idPrefix}-name`}>Name *</Label>
        <Input
          id={`${idPrefix}-name`}
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Supplier name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-email`}>Email</Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          value={value.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="supplier@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-phone`}>Phone</Label>
        <Input
          id={`${idPrefix}-phone`}
          value={value.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder="+1234567890"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-contactPerson`}>Contact Person</Label>
        <Input
          id={`${idPrefix}-contactPerson`}
          value={value.contactPerson}
          onChange={(e) => onChange({ contactPerson: e.target.value })}
          placeholder="John Doe"
        />
      </div>

      <div className="space-y-2">
        <UnifiedSelector
          label="Payment Terms"
          type="payment_terms"
          items={paymentTermsItems}
          selectedId={value.paymentTerms || undefined}
          onSelect={(item) => onChange({ paymentTerms: item.id === 0 ? "" : String(item.id) })}
          placeholder="Select payment terms"
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor={`${idPrefix}-address`}>Address</Label>
        <Textarea
          id={`${idPrefix}-address`}
          value={value.address}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder="Supplier address"
          rows={3}
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor={`${idPrefix}-notes`}>Notes</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          value={value.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Additional notes"
          rows={3}
        />
      </div>

      <div className="space-y-3 md:col-span-2">
        <Label>Supplier Type</Label>
        <div className="flex flex-wrap gap-4">
          {supplierTypeValues.map((ev) => {
            const typeValue = ev.name;
            const checked = value.supplierType.includes(typeValue);
            return (
              <div key={ev.name} className="flex items-center space-x-2">
                <Checkbox
                  id={`${idPrefix}-type-${ev.name}`}
                  checked={checked}
                  onCheckedChange={(next) => {
                    const newTypes = next
                      ? [...value.supplierType.filter((t) => t !== typeValue), typeValue]
                      : value.supplierType.filter((t) => t !== typeValue);
                    onChange({
                      supplierType:
                        newTypes.length > 0
                          ? newTypes
                          : [supplierTypeValues[0]?.name ?? "supplier"],
                    });
                  }}
                />
                <Label htmlFor={`${idPrefix}-type-${ev.name}`} className="font-normal cursor-pointer">
                  {ev.label ?? ev.name}
                </Label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center space-x-2 md:col-span-2">
        <Checkbox
          id={`${idPrefix}-isActive`}
          checked={value.isActive}
          onCheckedChange={(checked) => onChange({ isActive: checked === true })}
        />
        <Label htmlFor={`${idPrefix}-isActive`} className="font-normal cursor-pointer">
          Active
        </Label>
      </div>
    </div>
  );
}
