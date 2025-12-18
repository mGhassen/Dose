"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Badge } from "@kit/ui/badge";
import { Checkbox } from "@kit/ui/checkbox";
import { Save, X, Edit, Plus, Trash2 } from "lucide-react";
import AppLayout from "@/components/app-layout";
import {
  useMetadataEnumById,
  useUpdateMetadataEnum,
  useDeleteMetadataEnum,
  useEnumValuesByEnumId,
  useCreateEnumValue,
  useUpdateEnumValue,
  useDeleteEnumValue,
} from "@kit/hooks";
import { toast } from "sonner";
import type { MetadataEnumValue } from "@kit/hooks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@kit/ui/dialog";

interface MetadataEnumDetailContentProps {
  enumId: number;
}

export default function MetadataEnumDetailContent({ enumId }: MetadataEnumDetailContentProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState<{
    value: MetadataEnumValue | null;
  } | null>(null);
  const [creatingValue, setCreatingValue] = useState(false);

  const { data: enumItem, isLoading } = useMetadataEnumById(enumId);
  const { data: enumValues } = useEnumValuesByEnumId(enumId);
  const updateMutation = useUpdateMetadataEnum();
  const deleteMutation = useDeleteMetadataEnum();
  const createValueMutation = useCreateEnumValue();
  const updateValueMutation = useUpdateEnumValue();
  const deleteValueMutation = useDeleteEnumValue();

  const [formData, setFormData] = useState({
    label: "",
    description: "",
    isActive: true,
  });

  useEffect(() => {
    if (enumItem) {
      setFormData({
        label: enumItem.label,
        description: enumItem.description || "",
        isActive: enumItem.isActive,
      });
    }
  }, [enumItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!enumId || !formData.label) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: enumId,
        data: {
          label: formData.label,
          description: formData.description || undefined,
          isActive: formData.isActive,
        },
      });
      toast.success("Enum updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update enum");
    }
  };

  const handleDelete = async () => {
    if (!enumId) return;
    if (!confirm("Are you sure you want to delete this enum? This will also delete all its values.")) return;

    try {
      await deleteMutation.mutateAsync(enumId);
      toast.success("Enum deleted successfully");
      router.push('/metadata-enums');
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete enum");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateValue = async (data: {
    name: string;
    label: string;
    description?: string;
    value?: number;
    displayOrder?: number;
  }) => {
    if (!enumId) return;
    try {
      await createValueMutation.mutateAsync({ enumId, data });
      toast.success("Enum value created successfully");
      setCreatingValue(false);
    } catch (error) {
      toast.error("Failed to create enum value");
      console.error(error);
    }
  };

  const handleUpdateValue = async (valueId: number, data: Partial<MetadataEnumValue>) => {
    if (!enumId) return;
    try {
      await updateValueMutation.mutateAsync({ enumId, valueId, data });
      toast.success("Enum value updated successfully");
      setEditingValue(null);
    } catch (error) {
      toast.error("Failed to update enum value");
      console.error(error);
    }
  };

  const handleDeleteValue = async (valueId: number) => {
    if (!enumId) return;
    if (!confirm("Are you sure you want to delete this enum value?")) return;

    try {
      await deleteValueMutation.mutateAsync({ enumId, valueId });
      toast.success("Enum value deleted successfully");
    } catch (error) {
      toast.error("Failed to delete enum value");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!enumItem) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Enum not found</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{enumItem.label}</h1>
            <p className="text-muted-foreground">Enum: {enumItem.name}</p>
          </div>
          <div className="flex gap-2">
            {!isEditing && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Form/Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Enum" : "Enum Information"}</CardTitle>
            <CardDescription>
              {isEditing ? "Update the details for this enum" : "View and manage enum details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name (read-only) */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={enumItem.name}
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      Name cannot be changed
                    </p>
                  </div>

                  {/* Label */}
                  <div className="space-y-2">
                    <Label htmlFor="label">Label *</Label>
                    <Input
                      id="label"
                      value={formData.label}
                      onChange={(e) => handleInputChange('label', e.target.value)}
                      required
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

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        label: enumItem.label,
                        description: enumItem.description || "",
                        isActive: enumItem.isActive,
                      });
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <div className="mt-1 font-medium">{enumItem.name}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Label</Label>
                    <div className="mt-1 font-medium">{enumItem.label}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge variant={enumItem.isActive ? "default" : "secondary"}>
                        {enumItem.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Value Count</Label>
                    <div className="mt-1 font-medium">{enumItem.valueCount || 0}</div>
                  </div>
                  {enumItem.description && (
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground">Description</Label>
                      <div className="mt-1">{enumItem.description}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enum Values Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Enum Values</CardTitle>
                <CardDescription>
                  Manage the values for this enum
                </CardDescription>
              </div>
              <Dialog open={creatingValue} onOpenChange={setCreatingValue}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Value
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Enum Value</DialogTitle>
                    <DialogDescription>
                      Add a new value to this enum
                    </DialogDescription>
                  </DialogHeader>
                  <CreateValueForm
                    onSubmit={(data) => {
                      handleCreateValue(data);
                    }}
                    onCancel={() => setCreatingValue(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {!enumValues || enumValues.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No values defined for this enum
                </p>
              ) : (
                enumValues.map((value) => (
                  <div
                    key={value.id}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{value.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {value.name}
                        {value.description && ` • ${value.description}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={value.isActive ? "default" : "secondary"}>
                        {value.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingValue({ value })}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteValue(value.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit value dialog */}
        {editingValue && editingValue.value && (
          <Dialog
            open={!!editingValue}
            onOpenChange={(open) => setEditingValue(open ? editingValue : null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Enum Value</DialogTitle>
                <DialogDescription>
                  Update the enum value details
                </DialogDescription>
              </DialogHeader>
              <EditValueForm
                value={editingValue.value}
                onSubmit={(data) => {
                  handleUpdateValue(editingValue.value!.id, data);
                }}
                onCancel={() => setEditingValue(null)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}

function CreateValueForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: {
    name: string;
    label: string;
    description?: string;
    value?: number;
    displayOrder?: number;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState<string>("");
  const [displayOrder, setDisplayOrder] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !label) {
      toast.error("Name and label are required");
      return;
    }
    onSubmit({
      name,
      label,
      description: description || undefined,
      value: value ? parseInt(value, 10) : undefined,
      displayOrder: displayOrder ? parseInt(displayOrder, 10) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., rent"
          required
        />
      </div>
      <div>
        <Label htmlFor="label">Label *</Label>
        <Input
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., Rent"
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="value">Value</Label>
          <Input
            id="value"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Optional numeric value"
          />
        </div>
        <div>
          <Label htmlFor="displayOrder">Display Order</Label>
          <Input
            id="displayOrder"
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            placeholder="Order for display"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create</Button>
      </DialogFooter>
    </form>
  );
}

function EditValueForm({
  value,
  onSubmit,
  onCancel,
}: {
  value: MetadataEnumValue;
  onSubmit: (data: Partial<MetadataEnumValue>) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(value.label);
  const [description, setDescription] = useState(value.description || "");
  const [isActive, setIsActive] = useState(value.isActive ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label) {
      toast.error("Label is required");
      return;
    }
    onSubmit({
      label,
      description: description || undefined,
      isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={value.name} disabled />
        <p className="text-xs text-muted-foreground mt-1">
          Name cannot be changed
        </p>
      </div>
      <div>
        <Label htmlFor="label">Label *</Label>
        <Input
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <Label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded"
          />
          Active
        </Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Update</Button>
      </DialogFooter>
    </form>
  );
}



