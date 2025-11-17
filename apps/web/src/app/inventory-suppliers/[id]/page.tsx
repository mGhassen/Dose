"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Checkbox } from "@kit/ui/checkbox";
import { Save, X, Trash2 } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useInventorySupplierById, useUpdateInventorySupplier, useDeleteInventorySupplier } from "@kit/hooks";
import { toast } from "sonner";
import { formatDate } from "@kit/lib/date-format";

interface SupplierDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function SupplierDetailPage({ params }: SupplierDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { data: supplier, isLoading } = useInventorySupplierById(resolvedParams?.id || "");
  const updateSupplier = useUpdateInventorySupplier();
  const deleteMutation = useDeleteInventorySupplier();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    contactPerson: "",
    paymentTerms: "",
    notes: "",
    isActive: true,
  });

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        email: supplier.email || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        contactPerson: supplier.contactPerson || "",
        paymentTerms: supplier.paymentTerms || "",
        notes: supplier.notes || "",
        isActive: supplier.isActive,
      });
    }
  }, [supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Please fill in the supplier name");
      return;
    }

    if (!resolvedParams?.id) return;

    try {
      await updateSupplier.mutateAsync({
        id: resolvedParams.id,
        data: {
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          contactPerson: formData.contactPerson || undefined,
          paymentTerms: formData.paymentTerms || undefined,
          notes: formData.notes || undefined,
          isActive: formData.isActive,
        },
      });
      toast.success("Supplier updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update supplier");
    }
  };

  const handleDelete = async () => {
    if (!resolvedParams?.id) return;
    
    if (!confirm("Are you sure you want to delete this supplier? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(resolvedParams.id);
      toast.success("Supplier deleted successfully");
      router.push('/inventory-suppliers');
    } catch (error) {
      toast.error("Failed to delete supplier");
      console.error(error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading || !resolvedParams) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  if (!supplier) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Supplier Not Found</h1>
            <p className="text-muted-foreground">The supplier you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/inventory-suppliers')}>Back to Suppliers</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Supplier" : supplier.name}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update supplier information" : "Supplier details and information"}
            </p>
          </div>
          {!isEditing && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Supplier" : "Supplier Information"}</CardTitle>
            <CardDescription>
              {isEditing ? "Update the details for this supplier" : "View and manage supplier details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input
                      id="contactPerson"
                      value={formData.contactPerson}
                      onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">Payment Terms</Label>
                    <Input
                      id="paymentTerms"
                      value={formData.paymentTerms}
                      onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={3}
                    />
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
                    onClick={() => setIsEditing(false)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateSupplier.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateSupplier.isPending ? "Updating..." : "Update Supplier"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-base font-semibold mt-1">{supplier.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <p className="text-base mt-1">{supplier.isActive ? "Active" : "Inactive"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-base mt-1">{supplier.email || "—"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="text-base mt-1">{supplier.phone || "—"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
                    <p className="text-base mt-1">{supplier.contactPerson || "—"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Payment Terms</label>
                    <p className="text-base mt-1">{supplier.paymentTerms || "—"}</p>
                  </div>
                  {supplier.address && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Address</label>
                      <p className="text-base mt-1">{supplier.address}</p>
                    </div>
                  )}
                  {supplier.notes && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Notes</label>
                      <p className="text-base mt-1">{supplier.notes}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Created:</span> {formatDate(supplier.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span> {formatDate(supplier.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

