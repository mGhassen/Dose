"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useLeasingById, useUpdateLeasing } from "@kit/hooks";
import { toast } from "sonner";
import type { LeasingType, ExpenseRecurrence } from "@kit/types";

interface EditLeasingPageProps {
  params: Promise<{ id: string }>;
}

export default function EditLeasingPage({ params }: EditLeasingPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { data: leasing, isLoading } = useLeasingById(resolvedParams?.id || "");
  const updateLeasing = useUpdateLeasing();
  
  const [formData, setFormData] = useState({
    name: "",
    type: "operating" as LeasingType,
    amount: "",
    startDate: "",
    endDate: "",
    frequency: "monthly" as ExpenseRecurrence,
    description: "",
    lessor: "",
    isActive: true,
  });

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (leasing) {
      setFormData({
        name: leasing.name,
        type: leasing.type,
        amount: leasing.amount.toString(),
        startDate: leasing.startDate.split('T')[0],
        endDate: leasing.endDate ? leasing.endDate.split('T')[0] : "",
        frequency: leasing.frequency,
        description: leasing.description || "",
        lessor: leasing.lessor || "",
        isActive: leasing.isActive,
      });
    }
  }, [leasing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || formData.amount === "" || !formData.startDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!resolvedParams?.id) return;

    try {
      await updateLeasing.mutateAsync({
        id: resolvedParams.id,
        data: {
          name: formData.name,
          type: formData.type,
          amount: parseFloat(formData.amount),
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          frequency: formData.frequency,
          description: formData.description || undefined,
          lessor: formData.lessor || undefined,
          isActive: formData.isActive,
        },
      });
      toast.success("Leasing payment updated successfully");
      router.push(`/leasing/${resolvedParams.id}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update leasing payment");
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

  if (!leasing) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Leasing Payment Not Found</h1>
            <p className="text-muted-foreground">The leasing payment you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/leasing')}>Back to Leasing</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Leasing Payment</h1>
          <p className="text-muted-foreground">Update leasing payment information</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Leasing Payment Information</CardTitle>
            <CardDescription>Update the details for this leasing payment</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>

                {/* Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleInputChange('type', value as LeasingType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operating">Operating</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Frequency */}
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency *</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => handleInputChange('frequency', value as ExpenseRecurrence)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">One Time</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    required
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                  />
                </div>

                {/* Lessor */}
                <div className="space-y-2">
                  <Label htmlFor="lessor">Lessor</Label>
                  <Input
                    id="lessor"
                    value={formData.lessor}
                    onChange={(e) => handleInputChange('lessor', e.target.value)}
                    placeholder="Lessor name or company"
                  />
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="isActive">Status</Label>
                  <Select
                    value={formData.isActive ? "true" : "false"}
                    onValueChange={(value) => handleInputChange('isActive', value === "true")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Additional notes about this leasing payment"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/leasing/${resolvedParams.id}`)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={updateLeasing.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateLeasing.isPending ? "Updating..." : "Update Leasing Payment"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

