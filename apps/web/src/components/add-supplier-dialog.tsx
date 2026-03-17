"use client";

import { useMemo, useState } from "react";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Checkbox } from "@kit/ui/checkbox";
import { Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kit/ui/dialog";
import { UnifiedSelector } from "@/components/unified-selector";
import { useCreateInventorySupplier, useMetadataEnum } from "@kit/hooks";
import { toast } from "sonner";

export interface AddSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (supplier: { id: number; name: string }) => void;
  supplierTypes?: Array<"supplier" | "vendor" | "lender" | "customer">;
  dialogTitle?: string;
}

export function AddSupplierDialog({
  open,
  onOpenChange,
  onCreated,
  supplierTypes = ["supplier"],
  dialogTitle = "Create Supplier",
}: AddSupplierDialogProps) {
  const createSupplier = useCreateInventorySupplier();
  const { data: paymentTermsValues = [] } = useMetadataEnum("SupplierPaymentTerms");
  const { data: supplierTypeValues = [] } = useMetadataEnum("SupplierType");

  const paymentTermsItems = useMemo(
    () => paymentTermsValues.map((ev) => ({ id: ev.name, name: ev.label ?? ev.name })),
    [paymentTermsValues]
  );

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    contactPerson: "",
    paymentTerms: "",
    notes: "",
    supplierType: supplierTypes as Array<"supplier" | "vendor" | "lender" | "customer">,
    isActive: true,
  });

  const reset = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      contactPerson: "",
      paymentTerms: "",
      notes: "",
      supplierType: supplierTypes as Array<"supplier" | "vendor" | "lender" | "customer">,
      isActive: true,
    });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!formData.name.trim()) {
      toast.error("Please fill in the supplier name");
      return;
    }

    try {
      const created = await createSupplier.mutateAsync({
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        contactPerson: formData.contactPerson.trim() || undefined,
        paymentTerms: formData.paymentTerms || undefined,
        notes: formData.notes.trim() || undefined,
        supplierType: formData.supplierType,
        isActive: formData.isActive,
      });

      toast.success("Supplier created successfully");
      onCreated?.({ id: created.id, name: created.name });
      handleOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to create supplier");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle>Supplier Information</CardTitle>
            <CardDescription>Enter the details for this supplier</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="add-supplier-name">Name *</Label>
                  <Input
                    id="add-supplier-name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Supplier name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-supplier-email">Email</Label>
                  <Input
                    id="add-supplier-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="supplier@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-supplier-phone">Phone</Label>
                  <Input
                    id="add-supplier-phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-supplier-contactPerson">Contact Person</Label>
                  <Input
                    id="add-supplier-contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <UnifiedSelector
                    label="Payment Terms"
                    type="payment_terms"
                    items={paymentTermsItems}
                    selectedId={formData.paymentTerms || undefined}
                    onSelect={(item) => handleInputChange("paymentTerms", item.id === 0 ? "" : String(item.id))}
                    placeholder="Select payment terms"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="add-supplier-address">Address</Label>
                  <Textarea
                    id="add-supplier-address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="Supplier address"
                    rows={3}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="add-supplier-notes">Notes</Label>
                  <Textarea
                    id="add-supplier-notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Additional notes"
                    rows={3}
                  />
                </div>

                <div className="space-y-3 md:col-span-2">
                  <Label>Supplier Type</Label>
                  <div className="flex gap-4">
                    {supplierTypeValues.map((ev) => {
                      const typeValue = ev.name as "supplier" | "vendor" | "lender" | "customer";
                      return (
                        <div key={ev.name} className="flex items-center space-x-2">
                          <Checkbox
                            id={`add-supplier-type-${ev.name}`}
                            checked={formData.supplierType.includes(typeValue)}
                            onCheckedChange={(checked) => {
                              const newTypes = checked
                                ? [...formData.supplierType.filter((t) => t !== typeValue), typeValue]
                                : formData.supplierType.filter((t) => t !== typeValue);
                              handleInputChange(
                                "supplierType",
                                newTypes.length > 0 ? newTypes : ([supplierTypes[0] ?? "supplier"] as any)
                              );
                            }}
                          />
                          <Label
                            htmlFor={`add-supplier-type-${ev.name}`}
                            className="font-normal cursor-pointer"
                          >
                            {ev.label ?? ev.name}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center space-x-2 md:col-span-2">
                  <Checkbox
                    id="add-supplier-isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => handleInputChange("isActive", checked)}
                  />
                  <Label htmlFor="add-supplier-isActive" className="font-normal cursor-pointer">
                    Active
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createSupplier.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createSupplier.isPending ? "Creating..." : "Create Supplier"}
                </Button>
              </DialogFooter>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

