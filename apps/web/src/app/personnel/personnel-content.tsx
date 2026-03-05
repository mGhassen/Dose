"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { usePersonnel, useDeletePersonnel } from "@kit/hooks";
import type { Personnel, PersonnelType } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { StatusPin } from "@/components/status-pin";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";
import { useDashboardPeriod } from "@/components/dashboard-period-provider";

export default function PersonnelContent() {
  const router = useRouter();
  const { dateRange } = useDashboardPeriod();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: personnelResponse, isLoading } = usePersonnel({ page: 1, limit: 1000 });

  const filteredPersonnel = useMemo(() => {
    if (!personnelResponse?.data) return [];
    return personnelResponse.data.filter(person => {
      const start = person.startDate;
      const end = person.endDate;
      return start <= dateRange.endDate && (!end || end >= dateRange.startDate);
    });
  }, [personnelResponse?.data, dateRange]);
  
  const paginatedPersonnel = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredPersonnel.slice(startIndex, startIndex + pageSize);
  }, [filteredPersonnel, page, pageSize]);
  
  const totalPages = Math.ceil(filteredPersonnel.length / pageSize);
  const deleteMutation = useDeletePersonnel();

  const columns: ColumnDef<Personnel>[] = useMemo(() => [
    {
      accessorKey: "firstName",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <StatusPin active={row.original.isActive} size="sm" />
          <span className="font-medium">{row.original.firstName} {row.original.lastName}</span>
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
  ], []);

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(String(id));
      toast.success("Personnel record deleted successfully");
    } catch (error) {
      toast.error("Failed to delete personnel record");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(String(id))));
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
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0 flex items-center justify-between pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personnel</h1>
          <p className="text-muted-foreground mt-2">
            Manage and analyze your team costs and headcount
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <DataTablePage
              title=""
              description=""
              createHref="/personnel/create"
            data={paginatedPersonnel}
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
            pagination={{
              page,
              pageSize,
              totalCount: filteredPersonnel.length,
              totalPages,
              onPageChange: setPage,
              onPageSizeChange: (newSize) => {
                setPageSize(newSize);
                setPage(1);
              },
            }}
          />
          </div>
    </div>
  );
}

