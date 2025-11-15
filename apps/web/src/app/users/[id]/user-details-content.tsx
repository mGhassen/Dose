"use client";

import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Badge } from "@kit/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@kit/ui/card";
import { Separator } from "@kit/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { 
  Edit2, 
  Trash2, 
  Users,
  Mail,
  Calendar,
  Shield,
  AlertTriangle,
  MoreVertical,
} from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/app-layout";
import { useUser, useDeleteUser } from "@kit/hooks";
import { useDateFormat } from '@kit/hooks/use-date-format';
import { useEnumValues } from '@kit/hooks';
import RelatedDataLink from "@/components/related-data-link";

interface UserDetailsContentProps {
  userId: number;
}

export default function UserDetailsContent({ userId }: UserDetailsContentProps) {
  const { formatDate } = useDateFormat();
  const router = useRouter();
  const { data: user, isLoading } = useUser(userId);
  const deleteUser = useDeleteUser();
  const roleValues = useEnumValues('Role');

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUser.mutateAsync(userId);
        router.push('/users');
      } catch (error) {
        console.error("Failed to delete user:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-muted-foreground">Loading user...</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="container py-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">User not found</h3>
            <p className="text-muted-foreground mb-4">
              The user you're looking for doesn't exist or has been deleted.
            </p>
            <Button asChild>
              <Link href="/users">
                Back to Users
              </Link>
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-3xl font-bold">{user.firstName} {user.lastName}</h1>
              <p className="text-muted-foreground">User ID: {user.id}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/users/${user.id}/edit`}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID</label>
                  <p className="text-sm">{user.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm">{user.email}</p>
                </div>
                {user.phoneNumber && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                    <p className="text-sm">{user.phoneNumber}</p>
                  </div>
                )}
                {user.address && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p className="text-sm">{user.address}</p>
                  </div>
                )}
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">First Name</label>
                <p className="text-sm font-medium">{user.firstName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                <p className="text-sm font-medium">{user.lastName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Department</label>
                <p className="text-sm">{user.department || 'Not specified'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Role & Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Role & Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Role</label>
                {(() => {
                  const enumValue = roleValues.find((ev: any) => ev.id === user.roleId || ev.value === user.roleId);
                  if (enumValue) {
                    return (
                      <RelatedDataLink href={`/metadata-enums/Role`}>
                        <div className="space-y-2">
                          {enumValue.label && (
                            <div className="font-medium text-base">{enumValue.label}</div>
                          )}
                          {enumValue.name && enumValue.name !== enumValue.label && (
                            <div className="text-sm text-muted-foreground">{enumValue.name}</div>
                          )}
                          {enumValue.description && (
                            <div className="text-sm text-muted-foreground leading-relaxed">{enumValue.description}</div>
                          )}
                        </div>
                      </RelatedDataLink>
                    );
                  }
                  return (
                    <RelatedDataLink href={`/metadata-enums/Role`}>
                      <Badge variant="secondary" className="font-mono">
                        Role #{user.roleId}
                      </Badge>
                    </RelatedDataLink>
                  );
                })()}
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge className={user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm">{user.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created At</label>
                <p className="text-sm">{formatDate(user.createdAt)}</p>
              </div>
              {user.comment && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Comment</label>
                  <p className="text-sm">{user.comment}</p>
                </div>
              )}
              <Separator />
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="text-sm">{formatDate(user.updatedAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Deletable</label>
                <p className="text-sm">{user.isDeletable ? 'Yes' : 'No'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

