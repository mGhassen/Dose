"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Checkbox } from "@kit/ui/checkbox";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { usePersonnelById, useUpdatePersonnel } from "@kit/hooks";
import { toast } from "sonner";
import type { PersonnelType } from "@kit/types";

interface EditPersonnelPageProps {
  params: Promise<{ id: string }>;
}

export default function EditPersonnelPage({ params }: EditPersonnelPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { data: personnel, isLoading } = usePersonnelById(resolvedParams?.id || "");
  const updatePersonnel = useUpdatePersonnel();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    position: "",
    type: "" as PersonnelType | "",
    baseSalary: "",
    employerCharges: "",
    employerChargesType: "percentage" as "percentage" | "fixed",
    startDate: "",
    endDate: "",
    isActive: true,
    notes: "",
  });

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (personnel) {
      setFormData({
        firstName: personnel.firstName,
        lastName: personnel.lastName,
        email: personnel.email || "",
        position: personnel.position,
        type: personnel.type,
        baseSalary: personnel.baseSalary.toString(),
        employerCharges: personnel.employerCharges.toString(),
        employerChargesType: personnel.employerChargesType,
        startDate: personnel.startDate.split('T')[0],
        endDate: personnel.endDate ? personnel.endDate.split('T')[0] : "",
        isActive: personnel.isActive,
        notes: personnel.notes || "",
      });
    }
  }, [personnel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.position || !formData.type || 
        !formData.baseSalary || !formData.employerCharges || !formData.startDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!resolvedParams?.id) return;

    try {
      await updatePersonnel.mutateAsync({
        id: resolvedParams.id,
        data: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email || undefined,
          position: formData.position,
          type: formData.type as PersonnelType,
          baseSalary: parseFloat(formData.baseSalary),
          employerCharges: parseFloat(formData.employerCharges),
          employerChargesType: formData.employerChargesType,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          isActive: formData.isActive,
          notes: formData.notes || undefined,
        },
      });
      toast.success("Personnel record updated successfully");
      router.push(`/personnel/${resolvedParams.id}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update personnel record");
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

  if (!personnel) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Personnel Not Found</h1>
            <p className="text-muted-foreground">The personnel record you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/personnel')}>Back to Personnel</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Personnel</h1>
          <p className="text-muted-foreground">Update personnel information</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personnel Information</CardTitle>
            <CardDescription>Update the details for this personnel</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="John"
                    required
                  />
                </div>

                {/* Last Name */}
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="john.doe@example.com"
                  />
                </div>

                {/* Position */}
                <div className="space-y-2">
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    placeholder="e.g., Chef, Waiter, Manager"
                    required
                  />
                </div>

                {/* Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleInputChange('type', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Base Salary */}
                <div className="space-y-2">
                  <Label htmlFor="baseSalary">Base Salary *</Label>
                  <Input
                    id="baseSalary"
                    type="number"
                    step="0.01"
                    value={formData.baseSalary}
                    onChange={(e) => handleInputChange('baseSalary', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Employer Charges */}
                <div className="space-y-2">
                  <Label htmlFor="employerCharges">Employer Charges *</Label>
                  <Input
                    id="employerCharges"
                    type="number"
                    step="0.01"
                    value={formData.employerCharges}
                    onChange={(e) => handleInputChange('employerCharges', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Charges Type */}
                <div className="space-y-2">
                  <Label htmlFor="employerChargesType">Charges Type *</Label>
                  <Select
                    value={formData.employerChargesType}
                    onValueChange={(value) => handleInputChange('employerChargesType', value as "percentage" | "fixed")}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
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

                {/* Is Active */}
                <div className="space-y-2 flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes about this personnel"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/personnel/${resolvedParams.id}`)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePersonnel.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updatePersonnel.isPending ? "Updating..." : "Update Personnel"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

