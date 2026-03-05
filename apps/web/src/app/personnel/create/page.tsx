"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { DatePicker } from "@kit/ui/date-picker";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { UnifiedSelector } from "@/components/unified-selector";
import { Checkbox } from "@kit/ui/checkbox";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCreatePersonnel, useVariables, useMetadataEnum } from "@kit/hooks";
import { toast } from "sonner";
import type { PersonnelType } from "@kit/types";
import { dateToYYYYMMDD } from "@kit/lib";

export default function CreatePersonnelPage() {
  const router = useRouter();
  const createPersonnel = useCreatePersonnel();
  const { data: personnelTypeValues = [] } = useMetadataEnum("PersonnelType");
  const personnelTypeItems = personnelTypeValues.map((ev) => ({ id: ev.name, name: ev.label ?? ev.name }));

  const { data: variables } = useVariables();
  const variablesList = Array.isArray(variables) ? variables : [];
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
    salaryFrequency: "monthly" as "yearly" | "monthly" | "weekly",
    startDate: dateToYYYYMMDD(new Date()),
    endDate: "",
    isActive: true,
    notes: "",
  });
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.position || !formData.type || 
        !formData.baseSalary || !formData.startDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // Calculate employer charges from base salary and social security rate
      const inputSalary = parseFloat(formData.baseSalary);
      // Convert to monthly for calculation
      let monthlySalary = inputSalary;
      if (formData.salaryFrequency === 'yearly') {
        monthlySalary = inputSalary / 12;
      } else if (formData.salaryFrequency === 'weekly') {
        monthlySalary = inputSalary * 52 / 12;
      }
      const employerCharges = monthlySalary * socialSecurityRate;
      
      await createPersonnel.mutateAsync({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        position: formData.position,
        type: formData.type as PersonnelType,
        baseSalary: inputSalary, // Send input salary, API will convert to monthly
        salaryFrequency: formData.salaryFrequency,
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

                <UnifiedSelector
                  label="Type"
                  required
                  type="type"
                  items={personnelTypeItems}
                  selectedId={formData.type || undefined}
                  onSelect={(item) => handleInputChange('type', item.id === 0 ? '' : String(item.id))}
                  placeholder="Select type"
                />

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

                <div className="space-y-2">
                  <UnifiedSelector
                    label="Salary Package Frequency"
                    required
                    type="frequency"
                    items={[
                      { id: 'yearly', name: 'Yearly' },
                      { id: 'monthly', name: 'Monthly' },
                      { id: 'weekly', name: 'Weekly' },
                    ]}
                    selectedId={formData.salaryFrequency || undefined}
                    onSelect={(item) => handleInputChange('salaryFrequency', String(item.id))}
                    placeholder="Select frequency"
                  />
                  <p className="text-xs text-muted-foreground">
                    Select the frequency of the salary package
                  </p>
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <DatePicker
                    id="startDate"
                    value={formData.startDate ? new Date(formData.startDate) : undefined}
                    onChange={(d) => handleInputChange("startDate", d ? dateToYYYYMMDD(d) : "")}
                    placeholder="Pick a date"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <DatePicker
                    id="endDate"
                    value={formData.endDate ? new Date(formData.endDate) : undefined}
                    onChange={(d) => handleInputChange("endDate", d ? dateToYYYYMMDD(d) : "")}
                    placeholder="Pick a date"
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

