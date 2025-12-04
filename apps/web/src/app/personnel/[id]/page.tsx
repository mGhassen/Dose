"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Checkbox } from "@kit/ui/checkbox";
import { Badge } from "@kit/ui/badge";
import { Save, X, Trash2, MoreVertical, Edit2, Calendar } from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/app-layout";
import { usePersonnelById, useUpdatePersonnel, useDeletePersonnel, usePersonnelSalaryProjections, useVariables } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate, formatMonthYear } from "@kit/lib/date-format";
import type { PersonnelType } from "@kit/types";
import { projectPersonnelSalary } from "@/lib/calculations/personnel-projections";
import { EditablePersonnelTimelineRow } from "../personnel-timeline-editable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kit/ui/table";

interface PersonnelDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function PersonnelDetailPage({ params }: PersonnelDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { data: personnel, isLoading } = usePersonnelById(resolvedParams?.id || "");
  const updatePersonnel = useUpdatePersonnel();
  const deleteMutation = useDeletePersonnel();
  
  // Fetch stored salary projection entries (for payment status)
  const { data: storedProjections, refetch: refetchProjections } = usePersonnelSalaryProjections(
    resolvedParams?.id || "",
    undefined,
    undefined
  );
  
  // Fetch variables to get employee social tax rate and social security rate
  const { data: variables } = useVariables();
  const variablesList = variables || [];
  const employeeSocialTaxVariable = useMemo(() => 
    variablesList.find((v: any) => v.name === 'Employee Social Tax Rate'),
    [variablesList]
  );
  const employeeSocialTaxRate = useMemo(() => 
    employeeSocialTaxVariable 
      ? employeeSocialTaxVariable.value / 100 // Convert percentage to decimal
      : 0.20, // Default to 20% if not found
    [employeeSocialTaxVariable]
  );
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
  
  // Calculate projections automatically based on personnel dates
  const calculatedProjections = useMemo(() => {
    if (!personnel) return [];
    
    const startDate = new Date(personnel.startDate);
    const endDate = personnel.endDate ? new Date(personnel.endDate) : new Date();
    const now = new Date();
    now.setFullYear(now.getFullYear() + 1); // Project 1 year ahead
    
    const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    const endMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    return projectPersonnelSalary(personnel, startMonth, endMonth, employeeSocialTaxRate, socialSecurityRate);
  }, [personnel, employeeSocialTaxRate, socialSecurityRate]);
  
  // Merge calculated projections with stored entries (to get payment status)
  const mergedProjections = calculatedProjections.map(calcProj => {
    const stored = storedProjections?.find((p: any) => p.month === calcProj.month);
    return {
      ...calcProj,
      // Add stored data if it exists
      id: stored?.id,
      isNetPaid: stored?.isNetPaid || false,
      isTaxesPaid: stored?.isTaxesPaid || false,
      netPaidDate: stored?.netPaidDate,
      taxesPaidDate: stored?.taxesPaidDate,
      actualNetAmount: stored?.actualNetAmount,
      actualTaxesAmount: stored?.actualTaxesAmount,
      notes: stored?.notes,
    };
  });
  
  const handleTimelineUpdate = () => {
    refetchProjections();
  };
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    position: "",
    type: "" as PersonnelType | "",
    baseSalary: "",
    salaryFrequency: "monthly" as "yearly" | "monthly" | "weekly",
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
        salaryFrequency: personnel.salaryFrequency || 'monthly',
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
        !formData.baseSalary || !formData.startDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!resolvedParams?.id) return;

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
      
      await updatePersonnel.mutateAsync({
        id: resolvedParams.id,
        data: {
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
        },
      });
      toast.success("Personnel record updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update personnel record");
    }
  };

  const handleDelete = async () => {
    if (!resolvedParams?.id) return;
    
    if (!confirm("Are you sure you want to delete this personnel record? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(Number(resolvedParams.id));
      toast.success("Personnel record deleted successfully");
      router.push('/personnel');
    } catch (error) {
      toast.error("Failed to delete personnel record");
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

  const typeLabels: Record<PersonnelType, string> = {
    full_time: "Full Time",
    part_time: "Part Time",
    contractor: "Contractor",
    intern: "Intern",
  };

  // Total cost = brut + employer taxes (employer taxes are added on top of brut)
  const totalCost = personnel.baseSalary + (personnel.employerCharges || personnel.baseSalary * socialSecurityRate);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Personnel" : `${personnel.firstName} ${personnel.lastName}`}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update personnel information" : "Personnel details and information"}
            </p>
          </div>
          {!isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Form/Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Personnel" : "Personnel Information"}</CardTitle>
            <CardDescription>
              {isEditing ? "Update the details for this personnel" : "View and manage personnel details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* First Name */}
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
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
                    />
                  </div>

                  {/* Position */}
                  <div className="space-y-2">
                    <Label htmlFor="position">Position *</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
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
                        <SelectValue />
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
                      required
                    />
                  </div>

                  {/* Salary Frequency */}
                  <div className="space-y-2">
                    <Label htmlFor="salaryFrequency">Salary Package Frequency *</Label>
                    <Select
                      value={formData.salaryFrequency}
                      onValueChange={(value) => handleInputChange('salaryFrequency', value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select the frequency of the salary package
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
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
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
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-base font-semibold mt-1">
                      {personnel.firstName} {personnel.lastName}
                    </p>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-base mt-1">
                      {personnel.email || <span className="text-muted-foreground">—</span>}
                    </p>
                  </div>

                  {/* Position */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Position</label>
                    <p className="text-base font-semibold mt-1">{personnel.position}</p>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {typeLabels[personnel.type] || personnel.type}
                      </Badge>
                    </div>
                  </div>

                  {/* Base Salary */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Base Salary (Monthly)</label>
                    <p className="text-base font-semibold mt-1">{formatCurrency(personnel.baseSalary)}</p>
                  </div>

                  {/* Salary Frequency */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Salary Package Frequency</label>
                    <div className="text-base mt-1">
                      <Badge variant="outline">
                        {personnel.salaryFrequency === 'yearly' ? 'Yearly' : 
                         personnel.salaryFrequency === 'weekly' ? 'Weekly' : 'Monthly'}
                      </Badge>
                    </div>
                  </div>

                  {/* Total Cost */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total Monthly Cost</label>
                    <p className="text-base font-semibold mt-1 text-primary">{formatCurrency(totalCost)}</p>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                    <p className="text-base mt-1">{formatDate(personnel.startDate)}</p>
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">End Date</label>
                    <p className="text-base mt-1">
                      {personnel.endDate ? formatDate(personnel.endDate) : <span className="text-muted-foreground">—</span>}
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <Badge variant={personnel.isActive ? "default" : "secondary"}>
                        {personnel.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {personnel.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <p className="text-base mt-1 whitespace-pre-wrap">{personnel.notes}</p>
                  </div>
                )}

                {/* Metadata */}
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Created:</span> {formatDate(personnel.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span> {formatDate(personnel.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline Card - Only show when not editing */}
        {!isEditing && personnel && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Salary Timeline</CardTitle>
                <CardDescription>
                  Monthly salary projections from {formatDate(personnel.startDate)} to {personnel.endDate ? formatDate(personnel.endDate) : 'ongoing'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {mergedProjections.length === 0 ? (
                <div className="text-center py-10">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No salary projections for this personnel</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground">Total Months</div>
                      <div className="text-2xl font-bold mt-1">{mergedProjections.length}</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground">Total Net Salary</div>
                      <div className="text-2xl font-bold mt-1 text-primary">
                        {formatCurrency(mergedProjections.reduce((sum, p) => sum + (p.actualNetAmount || p.netSalary), 0))}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground">Total Taxes</div>
                      <div className="text-2xl font-bold mt-1 text-primary">
                        {formatCurrency(mergedProjections.reduce((sum, p) => sum + (p.actualTaxesAmount || (p.socialTaxes + p.employerTaxes)), 0))}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground">Total Cost</div>
                      <div className="text-2xl font-bold mt-1 text-primary">
                        {formatCurrency(mergedProjections.reduce((sum, p) => sum + (p.actualNetAmount || p.netSalary) + (p.actualTaxesAmount || (p.socialTaxes + p.employerTaxes)), 0))}
                      </div>
                    </div>
                  </div>

                  {/* Timeline Table */}
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead>Net Salary</TableHead>
                          <TableHead>Taxes</TableHead>
                          <TableHead>Payment Status</TableHead>
                          <TableHead>Payment Dates</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mergedProjections.map((projection: any, index: number) => {
                          const uniqueKey = `personnel-${personnel.id}-month-${projection.month}-${projection.id || 'calc'}-idx-${index}`;
                          
                          return (
                            <EditablePersonnelTimelineRow
                              key={uniqueKey}
                              projection={projection}
                              personnelId={personnel.id}
                              onUpdate={handleTimelineUpdate}
                              employeeSocialTaxRate={employeeSocialTaxRate}
                              socialSecurityRate={socialSecurityRate}
                            />
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

