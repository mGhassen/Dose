"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { usePersonnel, useDeletePersonnel } from "@kit/hooks";
import type { Personnel, PersonnelType } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function PersonnelContent() {
  const router = useRouter();
  const { data: personnel, isLoading } = usePersonnel();
  const deleteMutation = useDeletePersonnel();

  const columns: ColumnDef<Personnel>[] = useMemo(() => [
    {
      accessorKey: "firstName",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.firstName} {row.original.lastName}
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "position",
      header: "Position",
      cell: ({ row }) => row.original.position,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.type;
        const typeLabels: Record<PersonnelType, string> = {
          full_time: "Full Time",
          part_time: "Part Time",
          contractor: "Contractor",
          intern: "Intern",
        };
        return (
          <Badge variant="outline">
            {typeLabels[type] || type}
          </Badge>
        );
      },
    },
    {
      accessorKey: "baseSalary",
      header: "Base Salary",
      cell: ({ row }) => formatCurrency(row.original.baseSalary),
    },
    {
      accessorKey: "employerCharges",
      header: "Charges",
      cell: ({ row }) => {
        const charges = row.original.employerCharges;
        const chargesType = row.original.employerChargesType;
        return chargesType === 'percentage' 
          ? `${charges}%` 
          : formatCurrency(charges);
      },
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => formatDate(row.original.startDate),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ], []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this personnel record?")) return;
    
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Personnel record deleted successfully");
    } catch (error) {
      toast.error("Failed to delete personnel record");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} personnel record(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id)));
      toast.success(`${ids.length} personnel record(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete personnel records");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: Personnel[], type: 'selected' | 'all') => {
    const personnelToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['First Name', 'Last Name', 'Email', 'Position', 'Type', 'Base Salary', 'Employer Charges', 'Charges Type', 'Start Date', 'End Date'].join(','),
      ...personnelToCopy.map(p => [
        p.firstName,
        p.lastName,
        p.email || '',
        p.position,
        p.type,
        p.baseSalary,
        p.employerCharges,
        p.employerChargesType,
        p.startDate,
        p.endDate || '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${personnelToCopy.length} personnel record(s) copied to clipboard`);
  };

  const handleBulkExport = (data: Personnel[], type: 'selected' | 'all') => {
    const personnelToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['First Name', 'Last Name', 'Email', 'Position', 'Type', 'Base Salary', 'Employer Charges', 'Charges Type', 'Start Date', 'End Date'].join(','),
      ...personnelToExport.map(p => [
        p.firstName,
        p.lastName,
        p.email || '',
        p.position,
        p.type,
        p.baseSalary,
        p.employerCharges,
        p.employerChargesType,
        p.startDate,
        p.endDate || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personnel-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${personnelToExport.length} personnel record(s) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personnel</h1>
          <p className="text-muted-foreground mt-2">
            Manage and analyze your team costs and headcount
          </p>
        </div>
      </div>

      {/* Table View */}
          <div className="-mx-4">
            <DataTablePage
              title=""
              description=""
              createHref="/personnel/create"
            data={personnel || []}
            columns={columns}
            loading={isLoading}
            onRowClick={(person) => router.push(`/personnel/${person.id}`)}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            onBulkCopy={handleBulkCopy}
            onBulkExport={handleBulkExport}
            filterColumns={[
              { value: "type", label: "Type" },
              { value: "isActive", label: "Status" },
            ]}
            sortColumns={[
              { value: "firstName", label: "Name", type: "character varying" },
              { value: "baseSalary", label: "Base Salary", type: "numeric" },
              { value: "startDate", label: "Start Date", type: "date" },
            ]}
            localStoragePrefix="personnel"
            searchFields={["firstName", "lastName", "email", "position"]}
          />
          </div>
    </div>
  );
}

