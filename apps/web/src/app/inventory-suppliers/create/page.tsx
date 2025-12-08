"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Checkbox } from "@kit/ui/checkbox";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCreateInventorySupplier } from "@kit/hooks";
import { toast } from "sonner";

export default function CreateSupplierPage() {
  const router = useRouter();
  const createSupplier = useCreateInventorySupplier();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    contactPerson: "",
    paymentTerms: "",
    notes: "",
    supplierType: ['supplier'] as ('supplier' | 'vendor')[],
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Please fill in the supplier name");
      return;
    }

    try {
      await createSupplier.mutateAsync({
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        contactPerson: formData.contactPerson || undefined,
        paymentTerms: formData.paymentTerms || undefined,
        notes: formData.notes || undefined,
        supplierType: formData.supplierType,
        isActive: formData.isActive,
      });
      toast.success("Supplier created successfully");
      router.push('/inventory-suppliers');
    } catch (error: any) {
      toast.error(error?.message || "Failed to create supplier");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Supplier name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="supplier@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Input
                    id="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                    placeholder="Net 30, COD, etc."
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Supplier address"
                    rows={3}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Additional notes"
                    rows={3}
                  />
                </div>

                <div className="space-y-3 md:col-span-2">
                  <Label>Supplier Type</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="type-supplier"
                        checked={formData.supplierType.includes('supplier')}
                        onCheckedChange={(checked) => {
                          const newTypes = checked
                            ? [...formData.supplierType.filter(t => t !== 'supplier'), 'supplier']
                            : formData.supplierType.filter(t => t !== 'supplier');
                          handleInputChange('supplierType', newTypes.length > 0 ? newTypes : ['vendor']);
                        }}
                      />
                      <Label htmlFor="type-supplier" className="font-normal cursor-pointer">
                        Supplier (for items/inventory)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="type-vendor"
                        checked={formData.supplierType.includes('vendor')}
                        onCheckedChange={(checked) => {
                          const newTypes = checked
                            ? [...formData.supplierType.filter(t => t !== 'vendor'), 'vendor']
                            : formData.supplierType.filter(t => t !== 'vendor');
                          handleInputChange('supplierType', newTypes.length > 0 ? newTypes : ['supplier']);
                        }}
                      />
                      <Label htmlFor="type-vendor" className="font-normal cursor-pointer">
                        Vendor (for expenses/subscriptions/loans/leasing)
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                  />
                  <Label htmlFor="isActive" className="font-normal cursor-pointer">
                    Active
                  </Label>
                </div>
              </div>

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

