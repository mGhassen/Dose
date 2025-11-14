"use client";

import { useState } from "react";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { 
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Users,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import DataTablePage from "@/components/data-table-page";
import { useUsers, useDeleteUser } from "@kit/hooks";
import { RelatedDataLinks, ClickableBadges } from "@/components/related-data-link";
import { useDateFormat } from '@kit/hooks/use-date-format';
import { useEnumValues } from '@kit/hooks/useMetadataEnums';
import { User as ApiUser } from "@kit/lib/api/users";
import { toast } from '@kit/hooks/use-toast';
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { extractErrorMessage } from "@/shared/error-utils";

interface User {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: string;
  createdAt: string;
}

export default function UsersContent() {
  const router = useRouter();
  const t = useTranslations('pages.users');
  const tCommon = useTranslations('common');
  const { data: usersData, isLoading } = useUsers();
  const deleteUser = useDeleteUser();
  const { formatDate } = useDateFormat();
  const roleValues = useEnumValues('Role');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState<string>('');
  
  // Transform API users to table format
  const users: User[] = Array.isArray(usersData) ? usersData.map((apiUser: ApiUser) => {
    // Find role name from enum - check both id and value
    const roleEnum = roleValues.find((ev: any) => {
      const evId = ev.id ?? ev.value;
      return evId === apiUser.roleId || Number(evId) === Number(apiUser.roleId);
    });
    const roleName = roleEnum?.label || roleEnum?.name || `Role ${apiUser.roleId}`;
    
    // Map isActive to status string
    const status = apiUser.isActive ? 'active' : 'inactive';
    
    return {
      id: apiUser.id,
      email: apiUser.email || '',
      firstName: apiUser.firstName || null,
      lastName: apiUser.lastName || null,
      role: roleName,
      status: status,
      createdAt: apiUser.createdAt || ''
    };
  }) : [];

  const handleRowClick = (item: User) => {
    router.push(`/users/${item.id}`);
  };

  const handleDeleteClick = (id: number, name: string) => {
    setDeleteTargetId(id);
    setDeleteTargetName(name);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    
    try {
      await deleteUser.mutateAsync(deleteTargetId);
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
      setDeleteTargetName('');
    } catch (error: any) {
      console.error("Failed to delete user:", error);
      toast({
        title: "Error",
        description: extractErrorMessage(error, "Failed to delete user"),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    const user = users.find(u => u.id === id);
    if (user) {
      handleDeleteClick(id, user.email || `User #${id}`);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map((id) => deleteUser.mutateAsync(id)));
    } catch (error: any) {
      console.error("Failed to delete users:", error);
      toast({
        title: "Error",
        description: extractErrorMessage(error, "Failed to delete users"),
        variant: "destructive",
      });
    }
  };

  const handleBulkCopy = (data: User[], type: 'selected' | 'all') => {
    const csvContent = [
      ['ID', 'Email', 'Name', 'Role', 'Status', 'Created At'],
      ...data.map(item => [
        item.id,
        item.email || '',
        `${item.firstName || ''} ${item.lastName || ''}`.trim(),
        item.role || '',
        item.status || '',
        formatDate(item.createdAt)
      ])
    ].map(row => row.join(',')).join('\n');
    
    navigator.clipboard.writeText(csvContent);
  };

  const handleBulkExport = (data: User[], type: 'selected' | 'all') => {
    const csvContent = [
      ['ID', 'Email', 'Name', 'Role', 'Status', 'Created At'],
      ...data.map(item => [
        item.id,
        item.email || '',
        `${item.firstName || ''} ${item.lastName || ''}`.trim(),
        item.role || '',
        item.status || '',
        formatDate(item.createdAt)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${type}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'inactive':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'manager':
        return 'bg-primary text-primary-foreground';
      case 'operator':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'viewer':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "email",
      header: tCommon('user'),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{user.email}</div>
              <div className="text-sm text-muted-foreground">
                {`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'No name'}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: tCommon('role'),
      cell: ({ row }) => {
        const role = row.getValue("role") as string;
        return ClickableBadges.status(role, getRoleColor(role));
      },
    },
    {
      accessorKey: "status",
      header: tCommon('status'),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <div className="flex items-center space-x-2">
            {getStatusIcon(status)}
            {ClickableBadges.status(status, getStatusColor(status))}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: tCommon('createdAt'),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string;
        return (
          <div className="text-sm">
            {formatDate(date)}
          </div>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">{tCommon('openMenu')}</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{tCommon('actions')}</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleRowClick(user);
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                {tCommon('view')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/users/${user.id}/edit`);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                {tCommon('edit')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(user.id, user.email || `User #${user.id}`);
                }}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {tCommon('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <DataTablePage
        title={t('title') || 'Users'}
        description={t('subtitle') || 'Manage system users and permissions'}
        createHref="/users/create"
        data={users}
        columns={columns}
        loading={isLoading}
        onRowClick={handleRowClick}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        onBulkCopy={handleBulkCopy}
        onBulkExport={handleBulkExport}
        filterColumns={[
          { value: "email", label: tCommon('email') },
          { value: "firstName", label: tCommon('firstName') },
          { value: "lastName", label: tCommon('lastName') },
          { value: "role", label: tCommon('role') },
          { value: "status", label: tCommon('status') }
        ]}
        sortColumns={[
          { value: "email", label: tCommon('email'), type: "character varying" },
          { value: "firstName", label: tCommon('firstName'), type: "character varying" },
          { value: "lastName", label: tCommon('lastName'), type: "character varying" },
          { value: "role", label: tCommon('role'), type: "character varying" },
          { value: "status", label: tCommon('status'), type: "character varying" },
          { value: "createdAt", label: tCommon('createdAt'), type: "timestamp" }
        ]}
        localStoragePrefix="users"
        searchFields={["email", "firstName", "lastName"]}
      />
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title={tCommon('delete') || "Delete User"}
        description={`Are you sure you want to delete "${deleteTargetName}"? This action cannot be undone.`}
        confirmText={tCommon('delete') || "Delete"}
        cancelText={tCommon('cancel') || "Cancel"}
        isPending={deleteUser.isPending}
        variant="destructive"
      />
    </>
  );
}

