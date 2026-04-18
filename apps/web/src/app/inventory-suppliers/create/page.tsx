"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { SupplierForm, SupplierFormValues, emptySupplierFormValues } from "@/components/supplier-form";
import { useCreateInventorySupplier } from "@kit/hooks";
import { toast } from "sonner";

export default function CreateSupplierPage() {
  const router = useRouter();
  const createSupplier = useCreateInventorySupplier();

  const [formData, setFormData] = useState<SupplierFormValues>(emptySupplierFormValues);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please fill in the supplier name");
      return;
    }

    try {
      await createSupplier.mutateAsync({
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
      router.push('/inventory-suppliers');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create supplier");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Supplier</h1>
          <p className="text-muted-foreground">Add a new supplier</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Supplier Information</CardTitle>
            <CardDescription>Enter the details for this supplier</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <SupplierForm
                value={formData}
                onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
                idPrefix="create"
              />

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/inventory-suppliers')}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createSupplier.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createSupplier.isPending ? "Creating..." : "Create Supplier"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
