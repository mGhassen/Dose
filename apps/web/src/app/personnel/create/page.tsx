"use client";

import { useState, useMemo } from "react";
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
import { useCreatePersonnel, useVariables } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import type { PersonnelType } from "@kit/types";

export default function CreatePersonnelPage() {
  const router = useRouter();
  const createPersonnel = useCreatePersonnel();
  
  // Fetch variables to get Social Security Rate
  const { data: variables } = useVariables();
  const variablesList = variables || [];
  const socialSecurityVariable = useMemo(() => 
    variablesList.find((v: any) => v.name === 'Social Security Rate'),
    [variablesList]
  );
  const socialSecurityRate = useMemo(() => 
    socialSecurityVariable 
      ? socialSecurityVariable.value / 100 // Convert percentage to decimal
      : 0.1875, // Default to 18.75% if not found
    [socialSecurityVariable]
  );
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    position: "",
    type: "" as PersonnelType | "",
    baseSalary: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    isActive: true,
    notes: "",
  });
  
  // Calculate employer charges automatically
  const calculatedEmployerCharges = useMemo(() => {
    if (!formData.baseSalary) return 0;
    const baseSalary = parseFloat(formData.baseSalary) || 0;
    return baseSalary * socialSecurityRate;
  }, [formData.baseSalary, socialSecurityRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.position || !formData.type || 
        !formData.baseSalary || !formData.startDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // Calculate employer charges from base salary and social security rate
      const baseSalary = parseFloat(formData.baseSalary);
      const employerCharges = baseSalary * socialSecurityRate;
      
      await createPersonnel.mutateAsync({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        position: formData.position,
        type: formData.type as PersonnelType,
        baseSalary: baseSalary,
        employerCharges: employerCharges,
        employerChargesType: 'percentage', // Always percentage, calculated from variable
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        isActive: formData.isActive,
        notes: formData.notes || undefined,
      });
      toast.success("Personnel record created successfully");
      router.push('/personnel');
    } catch (error: any) {
      toast.error(error?.message || "Failed to create personnel record");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Personnel</h1>
          <p className="text-muted-foreground">Add a new personnel record</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personnel Information</CardTitle>
            <CardDescription>Enter the details for this personnel</CardDescription>
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

                {/* Employer Charges (Calculated) */}
                <div className="space-y-2">
                  <Label htmlFor="employerCharges">Employer Charges (Calculated)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="employerCharges"
                      type="text"
                      value={formatCurrency(calculatedEmployerCharges)}
                      disabled
                      className="bg-muted"
                    />
                    <span className="text-sm text-muted-foreground">
                      ({socialSecurityRate * 100}% of base salary)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Calculated from Social Security Rate variable. Can be adjusted when recording actual payments.
                  </p>
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
                  onClick={() => router.push('/personnel')}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createPersonnel.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createPersonnel.isPending ? "Creating..." : "Create Personnel"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

