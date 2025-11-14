"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@smartlogbook/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@smartlogbook/ui/card";
import { Input } from "@smartlogbook/ui/input";
import { Label } from "@smartlogbook/ui/label";
import { Save, X } from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/app-layout";
import { UnifiedSelector } from "@/components/unified-selector";
import { useUser, useUpdateUser } from "@smartlogbook/hooks";
import { toast } from "@smartlogbook/hooks";
import { useMetadataEnum } from "@smartlogbook/hooks";
import RelatedDataLink from "@/components/related-data-link";
import appConfig from '@smartlogbook/config/app.config';

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export default function EditUserPage({ params }: EditUserPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { data: user, isLoading } = useUser(resolvedParams ? parseInt(resolvedParams.id) : 0);
  const updateUser = useUpdateUser();
  const { data: roleValues = [], isLoading: isLoadingRoles } = useMetadataEnum('Role');

  const [formData, setFormData] = useState({
    email: "",
    roleId: 0 as number
  });
  
  console.log('[User Edit] Render - formData:', formData, 'user:', user?.id, 'roleValues:', roleValues.length);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    console.log('[User Edit] useEffect - user:', user?.id, 'roleId:', user?.roleId, 'roleValues.length:', roleValues.length);
    
    if (user && roleValues.length > 0) {
      const matchedRoleId = user.roleId ?? 0;
      console.log('[User Edit] Setting formData - matchedRoleId:', matchedRoleId, 'email:', user.email);
      
      setFormData(prev => {
        console.log('[User Edit] setFormData callback - prev:', prev, 'new roleId:', matchedRoleId);
        if (prev.roleId === matchedRoleId && prev.email === (user.email || "")) {
          console.log('[User Edit] No change needed, keeping prev state');
          return prev;
        }
        const newState = {
        email: user.email || "",
          roleId: matchedRoleId
        };
        console.log('[User Edit] Updating formData to:', newState);
        return newState;
      });
    } else {
      console.log('[User Edit] Not setting - missing user or roleValues. user:', !!user, 'roleValues:', roleValues.length);
    }
  }, [user, roleValues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedParams) return;

    try {
      await updateUser.mutateAsync({
        id: parseInt(resolvedParams.id),
        data: {
          id: parseInt(resolvedParams.id),
          email: formData.email || undefined,
          roleId: formData.roleId || undefined
        }
      });

      toast({
        title: "Success",
        description: "User updated successfully",
      });
      router.push('/users');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading || isLoadingRoles) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading user...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
          <p className="text-muted-foreground mb-6">The user you're looking for doesn't exist.</p>
          <Link href="/users">
            <Button>Back to Users</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Edit User</h1>
            <p className="text-muted-foreground">Update user information</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Update the details for this user</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                  <Label htmlFor="email">Email</Label>
                    <div className="w-0"></div>
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="e.g., user@example.com"
                  />
                </div>

                {/* Role */}
                <UnifiedSelector
                  mode="single"
                  type="role"
                  items={roleValues.map((ev: any) => ({
                    id: ev.id,
                    name: ev.label || ev.name || '',
                    description: ev.description || '',
                  }))}
                  selectedId={formData.roleId || undefined}
                  onSelect={(item) => handleInputChange('roleId', item.id)}
                  placeholder="Select role"
                  searchPlaceholder="Search roles..."
                  label="Role"
                  isLoading={false}
                  getDisplayName={(item) => item.description ? `${item.name} - ${item.description}` : item.name || `Role ${item.id}`}
                  manageLink={appConfig.features.manageLinks ? {
                    href: "/metadata-enums/Role",
                    text: "Manage Enums"
                  } : undefined}
                />
              </div>

              {/* Read-only fields display */}
              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Additional Information (read-only)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">First Name: </span>
                    <span>{user.firstName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Name: </span>
                    <span>{user.lastName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Department: </span>
                    <span>{user.department || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone: </span>
                    <span>{user.phoneNumber || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6">
                <Link href="/users">
                  <Button type="button" variant="outline">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={updateUser.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateUser.isPending ? "Updating..." : "Update User"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
