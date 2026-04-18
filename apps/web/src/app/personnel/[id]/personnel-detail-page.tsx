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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@kit/ui/breadcrumb";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { UnifiedSelector } from "@/components/unified-selector";
import { Checkbox } from "@kit/ui/checkbox";
import { Badge } from "@kit/ui/badge";
import { StatusPin } from "@/components/status-pin";
import { Avatar, AvatarFallback } from "@kit/ui/avatar";
import { Skeleton } from "@kit/ui/skeleton";
import { Separator } from "@kit/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Save, X, Trash2, MoreVertical, Edit2, Calendar, ChevronLeft, User, Briefcase, Wallet, Mail, FileText } from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/app-layout";
import { usePersonnelById, useUpdatePersonnel, useDeletePersonnel, usePersonnelSalaryProjections, useVariables, useMetadataEnum } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { dateToYYYYMMDD } from "@kit/lib";
import { formatDate } from "@kit/lib/date-format";
import { DatePicker } from "@kit/ui/date-picker";
import type { PersonnelType } from "@kit/types";
import { projectPersonnelSalary } from "@/lib/calculations/personnel-projections";
import { EditablePersonnelTimelineRow } from "../personnel-timeline-editable";
import { ContractorHoursPanel } from "../_components/contractor-hours-panel";
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@kit/ui/table";

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <div className="text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}

interface PersonnelDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function PersonnelDetailPage({ params }: PersonnelDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { data: personnel, isLoading } = usePersonnelById(resolvedParams?.id || "");
  const updatePersonnel = useUpdatePersonnel();
  const deleteMutation = useDeletePersonnel();

  const { data: storedProjections, refetch: refetchProjections } = usePersonnelSalaryProjections(
    resolvedParams?.id || "",
    undefined,
    undefined
  );

  const { data: variables } = useVariables();
  const { data: personnelTypeValues = [] } = useMetadataEnum("PersonnelType");
  const { data: salaryFrequencyValues = [] } = useMetadataEnum("SalaryFrequency");
  const { data: positionValues = [] } = useMetadataEnum("PersonnelPosition");
  const variablesList = Array.isArray(variables) ? variables : [];
  const employeeSocialTaxVariable = useMemo(() =>
    variablesList.find((v: any) => v.name === 'Employee Social Tax Rate'),
    [variablesList]
  );
  const employeeSocialTaxRate = useMemo(() => {
    const rate = employeeSocialTaxVariable
      ? employeeSocialTaxVariable.value / 100
      : 0.20;
    return rate;
  }, [employeeSocialTaxVariable]);
  const socialSecurityVariable = useMemo(() =>
    variablesList.find((v: any) => v.name === 'Social Security Rate'),
    [variablesList]
  );
  const socialSecurityRate = useMemo(() => {
    const rate = socialSecurityVariable
      ? socialSecurityVariable.value / 100
      : 0.1875;
    return rate;
  }, [socialSecurityVariable]);

  const calculatedProjections = useMemo(() => {
    if (!personnel) return [];

    const startDate = new Date(personnel.startDate);
    const endDate = personnel.endDate ? new Date(personnel.endDate) : new Date();
    const now = new Date();
    now.setFullYear(now.getFullYear() + 1);

    const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    const endMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return projectPersonnelSalary(personnel, startMonth, endMonth, employeeSocialTaxRate, socialSecurityRate);
  }, [personnel, employeeSocialTaxRate, socialSecurityRate]);

  const mergedProjections = calculatedProjections.map(calcProj => {
    const stored = storedProjections?.find((p: any) => p.month === calcProj.month);
    return {
      personnelId: calcProj.personnelId,
      month: calcProj.month,
      bruteSalary: calcProj.bruteSalary,
      netSalary: calcProj.netSalary,
      socialTaxes: calcProj.socialTaxes,
      employerTaxes: calcProj.employerTaxes,
      netPaymentDate: calcProj.netPaymentDate,
      taxesPaymentDate: calcProj.taxesPaymentDate,
      isProjected: calcProj.isProjected,
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
    salaryFrequency: "monthly" as "yearly" | "monthly" | "weekly" | "hourly",
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
      const inputSalary = parseFloat(formData.baseSalary);
      const isHourly = formData.salaryFrequency === 'hourly';
      let monthlySalary = inputSalary;
      if (formData.salaryFrequency === 'yearly') {
        monthlySalary = inputSalary / 12;
      } else if (formData.salaryFrequency === 'weekly') {
        monthlySalary = inputSalary * 52 / 12;
      }
      const employerCharges = isHourly ? 0 : monthlySalary * socialSecurityRate;

      await updatePersonnel.mutateAsync({
        id: resolvedParams.id,
        data: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email || undefined,
          position: formData.position,
          type: formData.type as PersonnelType,
          baseSalary: inputSalary,
          salaryFrequency: formData.salaryFrequency,
          employerCharges: employerCharges,
          employerChargesType: 'percentage',
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
    try {
      await deleteMutation.mutateAsync(resolvedParams.id);
      toast.success("Personnel record deleted successfully");
      setIsDeleteDialogOpen(false);
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
        <div className="space-y-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink asChild><Link href="/personnel">Personnel</Link></BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage><Skeleton className="h-4 w-24" /></BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-3">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Card>
            <CardHeader><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-64 mt-2" /></CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!personnel) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Personnel not found</h2>
            <p className="text-sm text-muted-foreground">
              This record may have been deleted or doesn't exist.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/personnel')}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Personnel
          </Button>
        </div>
      </AppLayout>
    );
  }

  const personnelTypeItems = personnelTypeValues.map((ev) => ({ id: ev.name, name: ev.label ?? ev.name }));
  const salaryFrequencyItems = salaryFrequencyValues.map((ev) => ({ id: ev.name, name: ev.label ?? ev.name }));
  const positionItems = positionValues.map((ev) => ({ id: ev.name, name: ev.label ?? ev.name }));
  const typeLabels: Record<string, string> = Object.fromEntries(
    personnelTypeValues.map((ev) => [ev.name, ev.label ?? ev.name])
  );

  const isHourly = personnel.salaryFrequency === 'hourly';
  const totalCost = isHourly ? personnel.baseSalary : personnel.baseSalary + (personnel.baseSalary * employeeSocialTaxRate);
  const initials = `${personnel.firstName.charAt(0)}${personnel.lastName.charAt(0)}`.toUpperCase();

  return (
    <AppLayout>
      <div className="flex flex-col max-h-[calc(100vh-5rem)] overflow-hidden">
        <Breadcrumb className="shrink-0">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/personnel">Personnel</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{personnel.firstName} {personnel.lastName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0 mt-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="-ml-2 shrink-0">
              <Link href="/personnel"><ChevronLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-lg font-medium bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {isEditing ? "Edit Personnel" : `${personnel.firstName} ${personnel.lastName}`}
                </h1>
                <p className="text-muted-foreground">
                  {isEditing ? "Update personnel information" : personnel.position}
                </p>
                {!isEditing && (
                  <div className="flex flex-wrap gap-1.5 mt-2 items-center">
                    <Badge variant="outline">{typeLabels[personnel.type]}</Badge>
                    <StatusPin active={personnel.isActive} title={personnel.isActive ? "Active" : "Inactive"} />
                  </div>
                )}
              </div>
            </div>
          </div>
          {!isEditing && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
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
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={deleteMutation.isPending}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {isEditing ? (
        <div className="flex-1 min-h-0 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle>Edit Personnel</CardTitle>
            <CardDescription>Update the details for this personnel</CardDescription>
          </CardHeader>
          <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <UnifiedSelector label="Position" required type="position" items={positionItems} selectedId={formData.position || undefined} onSelect={(item) => handleInputChange('position', item.id === 0 ? '' : String(item.id))} placeholder="Select position" />
                  </div>
                  <UnifiedSelector label="Type" required type="type" items={personnelTypeItems} selectedId={formData.type || undefined} onSelect={(item) => handleInputChange('type', item.id === 0 ? '' : String(item.id))} placeholder="Select type" />
                  <div className="space-y-2">
                    <Label htmlFor="baseSalary">
                      {formData.salaryFrequency === 'hourly' ? 'Hourly Rate *' : 'Base Salary *'}
                    </Label>
                    <Input id="baseSalary" type="number" step="0.01" value={formData.baseSalary} onChange={(e) => handleInputChange('baseSalary', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <UnifiedSelector label="Salary Package Frequency" required type="frequency" items={salaryFrequencyItems} selectedId={formData.salaryFrequency || undefined} onSelect={(item) => handleInputChange('salaryFrequency', String(item.id))} placeholder="Select frequency" />
                    <p className="text-xs text-muted-foreground">Select the frequency of the salary package</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <DatePicker
                      id="startDate"
                      value={formData.startDate ? new Date(formData.startDate) : undefined}
                      onChange={(d) => handleInputChange("startDate", d ? dateToYYYYMMDD(d) : "")}
                      placeholder="Pick a date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <DatePicker
                      id="endDate"
                      value={formData.endDate ? new Date(formData.endDate) : undefined}
                      onChange={(d) => handleInputChange("endDate", d ? dateToYYYYMMDD(d) : "")}
                      placeholder="Pick a date"
                    />
                  </div>
                  <div className="space-y-2 flex items-center space-x-2 pt-6">
                    <Checkbox id="isActive" checked={formData.isActive} onCheckedChange={(checked) => handleInputChange('isActive', checked)} />
                    <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" value={formData.notes} onChange={(e) => handleInputChange('notes', e.target.value)} rows={3} />
                </div>
                <div className="flex justify-end space-x-4 pt-6">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}><X className="mr-2 h-4 w-4" />Cancel</Button>
                  <Button type="submit" disabled={updatePersonnel.isPending}><Save className="mr-2 h-4 w-4" />{updatePersonnel.isPending ? "Updating..." : "Update Personnel"}</Button>
                </div>
              </form>
          </CardContent>
        </Card>
        </div>
        ) : (
        <Tabs defaultValue="overview" className="flex flex-col flex-1 min-h-0 w-full mt-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 shrink-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">{isHourly ? "Hours" : "Salary Timeline"}</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="flex-1 min-h-0 overflow-auto mt-4 data-[state=inactive]:hidden">
        <Card>
          <CardHeader>
            <CardTitle>Personnel Information</CardTitle>
            <CardDescription>View and manage personnel details</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Personal
                    </h3>
                    <div className="space-y-0">
                      <DetailRow icon={User} label="Name">
                        {personnel.firstName} {personnel.lastName}
                      </DetailRow>
                      <DetailRow icon={Mail} label="Email">
                        {personnel.email || <span className="text-muted-foreground">—</span>}
                      </DetailRow>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      Employment
                    </h3>
                    <div className="space-y-0">
                      <DetailRow icon={Briefcase} label="Position">{personnel.position}</DetailRow>
                      <DetailRow icon={Calendar} label="Start Date">{formatDate(personnel.startDate)}</DetailRow>
                      <DetailRow icon={Calendar} label="End Date">
                        {personnel.endDate ? formatDate(personnel.endDate) : <span className="text-muted-foreground">Ongoing</span>}
                      </DetailRow>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    Compensation
                  </h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    <DetailRow icon={Wallet} label={isHourly ? "Hourly Rate" : "Base Salary"}>
                      {formatCurrency(personnel.baseSalary)}{' '}
                      <span className="text-muted-foreground font-normal">
                        / {isHourly ? 'hour' : 'month'}
                      </span>
                    </DetailRow>
                    <DetailRow icon={Wallet} label="Frequency">
                      <Badge variant="outline">
                        {personnel.salaryFrequency === 'yearly'
                          ? 'Yearly'
                          : personnel.salaryFrequency === 'weekly'
                          ? 'Weekly'
                          : personnel.salaryFrequency === 'hourly'
                          ? 'Hourly'
                          : 'Monthly'}
                      </Badge>
                    </DetailRow>
                    {!isHourly && (
                      <DetailRow icon={Wallet} label="Total Monthly Cost">
                        <span className="text-primary font-semibold">{formatCurrency(totalCost)}</span>
                      </DetailRow>
                    )}
                  </div>
                </div>
                {personnel.notes && (
                  <>
                    <Separator />
                    <DetailRow icon={FileText} label="Notes">
                      <span className="whitespace-pre-wrap font-normal">{personnel.notes}</span>
                    </DetailRow>
                  </>
                )}
                <Separator />
                <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
                  <span>Created {formatDate(personnel.createdAt)}</span>
                  <span>Updated {formatDate(personnel.updatedAt)}</span>
                </div>
              </div>
          </CardContent>
        </Card>
          </TabsContent>
          <TabsContent value="timeline" className="flex flex-col flex-1 min-h-0 mt-4 data-[state=inactive]:hidden">
            {isHourly ? (
              <ContractorHoursPanel personnel={personnel} />
            ) : mergedProjections.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 min-h-0 rounded-lg border border-dashed py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No salary projections</p>
                <p className="text-xs text-muted-foreground mt-1">Projections will appear based on start and end dates</p>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 shrink-0 mb-4">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Months</p>
                    <p className="text-2xl font-bold mt-1">{mergedProjections.length}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Salary</p>
                    <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(mergedProjections.reduce((sum, p) => sum + (p.actualNetAmount || p.netSalary), 0))}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Taxes</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(mergedProjections.reduce((sum, p) => sum + (p.actualTaxesAmount || (p.socialTaxes + p.employerTaxes)), 0))}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Cost</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(mergedProjections.reduce((sum, p) => sum + (p.actualNetAmount || p.netSalary) + (p.actualTaxesAmount || (p.socialTaxes + p.employerTaxes)), 0))}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between shrink-0 mb-2">
                  <p className="text-sm text-muted-foreground">
                    Monthly projections from {formatDate(personnel.startDate)} to {personnel.endDate ? formatDate(personnel.endDate) : "ongoing"}
                  </p>
                </div>
                <div className="flex-1 min-h-0 rounded-md border overflow-y-auto overflow-x-auto">
                  <table className="w-full caption-bottom text-sm">
                    <TableHeader className="sticky top-0 z-20 bg-background [&_tr]:border-b shadow-sm">
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Net Salary</TableHead>
                        <TableHead>Taxes</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mergedProjections.map((projection: any, index: number) => (
                        <EditablePersonnelTimelineRow key={`personnel-${personnel.id}-month-${projection.month}-${projection.id || "calc"}-idx-${index}`} projection={projection} personnelId={personnel.id} onUpdate={handleTimelineUpdate} employeeSocialTaxRate={employeeSocialTaxRate} socialSecurityRate={socialSecurityRate} />
                      ))}
                    </TableBody>
                    <TableFooter className="sticky bottom-0 z-20 bg-muted [&>tr]:border-t-0">
                      <TableRow className="bg-muted font-semibold hover:bg-muted">
                        <TableCell>Total</TableCell>
                        <TableCell className="tabular-nums">{formatCurrency(mergedProjections.reduce((sum, p) => sum + (p.actualNetAmount || p.netSalary), 0))}</TableCell>
                        <TableCell className="tabular-nums">{formatCurrency(mergedProjections.reduce((sum, p) => sum + (p.actualTaxesAmount || (p.socialTaxes + p.employerTaxes)), 0))}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  </table>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
        )}

        <ConfirmationDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDelete}
          title="Delete personnel record"
          description="Are you sure you want to delete this personnel record? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          isPending={deleteMutation.isPending}
          variant="destructive"
        />
      </div>
    </AppLayout>
  );
}
