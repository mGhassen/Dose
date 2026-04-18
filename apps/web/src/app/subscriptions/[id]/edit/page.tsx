"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { DatePicker } from "@kit/ui/date-picker";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { SupplierFormDialog } from "@/components/supplier-form-dialog";
import { CategorySelector } from "@/components/category-selector";
import { UnifiedSelector } from "@/components/unified-selector";
import { Checkbox } from "@kit/ui/checkbox";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useSubscriptionById, useUpdateSubscription, useInventorySuppliers, useMetadataEnum } from "@kit/hooks";
import { toast } from "sonner";
import type { ExpenseRecurrence } from "@kit/types";
import { dateToYYYYMMDD } from "@kit/lib";
import {
  createSubscriptionFormSchema,
  type CreateSubscriptionFormInput,
} from "@/shared/zod-schemas";

interface EditSubscriptionPageProps {
  params: Promise<{ id: string }>;
}

export default function EditSubscriptionPage({ params }: EditSubscriptionPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { data: subscription, isLoading } = useSubscriptionById(resolvedParams?.id || "");
  const updateSubscription = useUpdateSubscription();
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000, supplierType: "vendor" });
  const suppliers = suppliersResponse?.data || [];
  const { data: recurrenceValues = [] } = useMetadataEnum("ExpenseRecurrence");
  const recurrenceItems = recurrenceValues.map((ev) => ({ id: ev.name, name: ev.label ?? ev.name }));

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSubscriptionFormInput>({
    resolver: zodResolver(createSubscriptionFormSchema) as import("react-hook-form").Resolver<CreateSubscriptionFormInput>,
    defaultValues: {
      name: "",
      category: undefined,
      amount: 0,
      recurrence: "monthly",
      startDate: dateToYYYYMMDD(new Date()),
      endDate: "",
      description: "",
      vendor: "",
      supplierId: undefined,
      defaultTaxRatePercent: undefined,
      isActive: true,
    },
  });

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (subscription) {
      reset({
        name: subscription.name,
        category: subscription.category as CreateSubscriptionFormInput["category"],
        amount: subscription.amount,
        recurrence: subscription.recurrence as ExpenseRecurrence,
        startDate: subscription.startDate.split("T")[0],
        endDate: subscription.endDate ? subscription.endDate.split("T")[0] : "",
        description: subscription.description || "",
        vendor: subscription.vendor || "",
        supplierId: subscription.supplierId ?? undefined,
        defaultTaxRatePercent: subscription.defaultTaxRatePercent ?? undefined,
        isActive: subscription.isActive,
      });
    }
  }, [subscription, reset]);

  const onSubmit = async (data: CreateSubscriptionFormInput) => {
    if (!resolvedParams?.id) return;
    try {
      await updateSubscription.mutateAsync({
        id: resolvedParams.id,
        data: {
          name: data.name,
          category: data.category! as import("@kit/types").ExpenseCategory,
          amount: data.amount,
          recurrence: data.recurrence as import("@kit/types").ExpenseRecurrence,
          startDate: data.startDate,
          endDate: data.endDate || undefined,
          description: data.description || undefined,
          vendor: data.vendor || undefined,
          supplierId: data.supplierId,
          defaultTaxRatePercent: data.defaultTaxRatePercent,
          isActive: data.isActive ?? true,
        },
      });
      toast.success("Subscription updated successfully");
      router.push(`/subscriptions/${resolvedParams.id}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update subscription");
    }
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

  if (!subscription) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Subscription Not Found</h1>
            <p className="text-muted-foreground">The subscription you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push("/subscriptions")}>Back to Subscriptions</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Subscription</h1>
          <p className="text-muted-foreground">Update subscription information</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Information</CardTitle>
            <CardDescription>Enter the details for this subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="e.g., Office Rent"
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <CategorySelector
                        enumName="ExpenseCategory"
                        label="Category"
                        required
                        selectedId={field.value ?? undefined}
                        onSelect={(item) =>
                          field.onChange(item.id === 0 ? undefined : String(item.id))
                        }
                        placeholder="Select category"
                      />
                    )}
                  />
                  {errors.category && (
                    <p className="text-sm text-destructive">{errors.category.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    {...register("amount", { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {errors.amount && (
                    <p className="text-sm text-destructive">{errors.amount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Controller
                    name="recurrence"
                    control={control}
                    render={({ field }) => (
                      <UnifiedSelector
                        label="Recurrence"
                        required
                        type="recurrence"
                        items={recurrenceItems}
                        selectedId={field.value ?? undefined}
                        onSelect={(item) =>
                          field.onChange(String(item.id) as ExpenseRecurrence)
                        }
                        placeholder="Select recurrence"
                      />
                    )}
                  />
                  {errors.recurrence && (
                    <p className="text-sm text-destructive">{errors.recurrence.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Controller
                    name="startDate"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        id="startDate"
                        value={field.value ? new Date(field.value) : undefined}
                        onChange={(d) =>
                          field.onChange(d ? dateToYYYYMMDD(d) : "")
                        }
                        placeholder="Pick a date"
                      />
                    )}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-destructive">{errors.startDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Controller
                    name="endDate"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        id="endDate"
                        value={field.value ? new Date(field.value) : undefined}
                        onChange={(d) =>
                          field.onChange(d ? dateToYYYYMMDD(d) : "")
                        }
                        placeholder="Pick a date"
                        toYear={new Date().getFullYear() + 20}
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for ongoing subscriptions
                  </p>
                </div>

                <div className="space-y-2">
                  <Controller
                    name="supplierId"
                    control={control}
                    render={({ field }) => (
                      <>
                        <UnifiedSelector
                          label="Vendor"
                          type="vendor"
                          items={suppliers}
                          selectedId={field.value ?? undefined}
                          onSelect={(item) =>
                            field.onChange(item.id === 0 ? undefined : item.id)
                          }
                          onCreateNew={() => setAddVendorOpen(true)}
                          placeholder="Select vendor"
                          manageLink={
                            field.value
                              ? {
                                  href: `/inventory-suppliers/${field.value}`,
                                  text: "View vendor details →",
                                }
                              : undefined
                          }
                        />
                        <SupplierFormDialog
                          open={addVendorOpen}
                          onOpenChange={setAddVendorOpen}
                          onCreated={(v) => field.onChange(v.id)}
                          entityLabel="vendor"
                          defaultSupplierTypes={["vendor"]}
                        />
                      </>
                    )}
                  />
                </div>

                <div className="space-y-2 flex items-center space-x-2 pt-6">
                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="isActive"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Active
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Additional notes about this subscription"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/subscriptions/${resolvedParams.id}`)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={updateSubscription.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateSubscription.isPending ? "Updating..." : "Update Subscription"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
