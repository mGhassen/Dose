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
import { Avatar, AvatarFallback } from "@kit/ui/avatar";
import { Skeleton } from "@kit/ui/skeleton";
import { Separator } from "@kit/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Save, X, Trash2, MoreVertical, Edit2, Calendar, ChevronLeft, User, Briefcase, Wallet, Mail, FileText } from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/app-layout";
import { usePersonnelById, useUpdatePersonnel, useDeletePersonnel, usePersonnelSalaryProjections, useVariables } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
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
  const variablesList = Array.isArray(variables) ? variables : (variables?.data ?? []);
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
      const inputSalary = parseFloat(formData.baseSalary);
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
      await deleteMutation.mutateAsync(Number(resolvedParams.id));
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

  const typeLabels: Record<PersonnelType, string> = {
    full_time: "Full Time",
    part_time: "Part Time",
    contractor: "Contractor",
    intern: "Intern",
  };

  const totalCost = personnel.baseSalary + (personnel.baseSalary * employeeSocialTaxRate);
  const initials = `${personnel.firstName.charAt(0)}${personnel.lastName.charAt(0)}`.toUpperCase();

  return (
    <AppLayout>
      <div className="space-y-6">
        <Breadcrumb>
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

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="outline">{typeLabels[personnel.type]}</Badge>
                    <Badge variant={personnel.isActive ? "default" : "secondary"}>
                      {personnel.isActive ? "Active" : "Inactive"}
                    </Badge>
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
                    <Label htmlFor="position">Position *</Label>
                    <Input id="position" value={formData.position} onChange={(e) => handleInputChange('position', e.target.value)} required />
                  </div>
                  <UnifiedSelector label="Type" required type="type" items={[
                    { id: 'full_time', name: 'Full Time' }, { id: 'part_time', name: 'Part Time' },
                    { id: 'contractor', name: 'Contractor' }, { id: 'intern', name: 'Intern' },
                  ]} selectedId={formData.type || undefined} onSelect={(item) => handleInputChange('type', item.id === 0 ? '' : String(item.id))} placeholder="Select type" />
                  <div className="space-y-2">
                    <Label htmlFor="baseSalary">Base Salary *</Label>
                    <Input id="baseSalary" type="number" step="0.01" value={formData.baseSalary} onChange={(e) => handleInputChange('baseSalary', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <UnifiedSelector label="Salary Package Frequency" required type="frequency" items={[
                      { id: 'yearly', name: 'Yearly' }, { id: 'monthly', name: 'Monthly' }, { id: 'weekly', name: 'Weekly' },
                    ]} selectedId={formData.salaryFrequency || undefined} onSelect={(item) => handleInputChange('salaryFrequency', String(item.id))} placeholder="Select frequency" />
                    <p className="text-xs text-muted-foreground">Select the frequency of the salary package</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input id="startDate" type="date" value={formData.startDate} onChange={(e) => handleInputChange('startDate', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input id="endDate" type="date" value={formData.endDate} onChange={(e) => handleInputChange('endDate', e.target.value)} />
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
        ) : (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Salary Timeline</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
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
                    <DetailRow icon={Wallet} label="Base Salary">
                      {formatCurrency(personnel.baseSalary)} <span className="text-muted-foreground font-normal">/ month</span>
                    </DetailRow>
                    <DetailRow icon={Wallet} label="Frequency">
                      <Badge variant="outline">{personnel.salaryFrequency === 'yearly' ? 'Yearly' : personnel.salaryFrequency === 'weekly' ? 'Weekly' : 'Monthly'}</Badge>
                    </DetailRow>
                    <DetailRow icon={Wallet} label="Total Monthly Cost">
                      <span className="text-primary font-semibold">{formatCurrency(totalCost)}</span>
                    </DetailRow>
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
          <TabsContent value="timeline">
        <Card>
          <CardHeader>
            <CardTitle>Salary Timeline</CardTitle>
            <CardDescription>
              Monthly projections from {formatDate(personnel.startDate)} to {personnel.endDate ? formatDate(personnel.endDate) : "ongoing"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mergedProjections.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No salary projections</p>
                <p className="text-xs text-muted-foreground mt-1">Projections will appear based on start and end dates</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                <div className="rounded-lg border overflow-hidden">
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
                      {mergedProjections.map((projection: any, index: number) => (
                        <EditablePersonnelTimelineRow key={`personnel-${personnel.id}-month-${projection.month}-${projection.id || 'calc'}-idx-${index}`} projection={projection} personnelId={personnel.id} onUpdate={handleTimelineUpdate} employeeSocialTaxRate={employeeSocialTaxRate} socialSecurityRate={socialSecurityRate} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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
