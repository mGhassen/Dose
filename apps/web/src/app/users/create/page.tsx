"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@smartlogbook/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@smartlogbook/ui/card";
import { Input } from "@smartlogbook/ui/input";
import { Label } from "@smartlogbook/ui/label";
import { Save, X } from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/app-layout";
import { UnifiedSelector } from "@/components/unified-selector";
import { toast } from "@smartlogbook/hooks";
import { useCreateUser } from "@smartlogbook/hooks";
import { useMetadataEnum } from "@smartlogbook/hooks";
import RelatedDataLink from "@/components/related-data-link";
import appConfig from '@smartlogbook/config/app.config';

export default function CreateUserPage() {
  const router = useRouter();
  const createUser = useCreateUser();
  const { data: roleValues = [], isLoading: isLoadingRoles } = useMetadataEnum('Role');
  const [formData, setFormData] = useState({
    email: "",
    roleId: 0 as number
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.roleId) {
      toast({
        title: "Validation Error",
        description: "Email and Role are required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createUser.mutateAsync({
        email: formData.email,
        roleId: formData.roleId
      });
      toast({
        title: "Success",
        description: "User created successfully",
      });
      router.push('/users');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoadingRoles) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading roles...</p>
          </div>
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
            <h1 className="text-2xl font-bold">Create New User</h1>
            <p className="text-muted-foreground">Add a new user to the system</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Enter the details for the new user</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                  <Label htmlFor="email">Email *</Label>
                    <div className="w-0"></div> {/* Invisible spacer for alignment */}
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="e.g., user@example.com"
                    required
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
                  required
                  isLoading={false}
                  getDisplayName={(item) => item.description ? `${item.name} - ${item.description}` : item.name || `Role ${item.id}`}
                  manageLink={appConfig.features.manageLinks ? {
                    href: "/metadata-enums/Role",
                    text: "Manage Enums"
                  } : undefined}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6">
                <Link href="/users">
                  <Button type="button" variant="outline">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={createUser.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {createUser.isPending ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
