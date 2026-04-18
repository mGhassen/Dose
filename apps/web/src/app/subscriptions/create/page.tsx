"use client";

import { useState } from "react";
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
import { useCreateSubscription, useInventorySuppliers, useMetadataEnum } from "@kit/hooks";
import { toast } from "sonner";
import type { ExpenseRecurrence } from "@kit/types";
import Link from "next/link";
import { dateToYYYYMMDD } from "@kit/lib";
import {
  createSubscriptionFormSchema,
  type CreateSubscriptionFormInput,
} from "@/shared/zod-schemas";

export default function CreateSubscriptionPage() {
  const router = useRouter();
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const createSubscription = useCreateSubscription();
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000, supplierType: "vendor" });
  const suppliers = suppliersResponse?.data || [];
  const { data: recurrenceValues = [] } = useMetadataEnum("ExpenseRecurrence");
  const recurrenceItems = recurrenceValues.map((ev) => ({ id: ev.name, name: ev.label ?? ev.name }));

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateSubscriptionFormInput>({
    resolver: zodResolver(createSubscriptionFormSchema) as import("react-hook-form").Resolver<CreateSubscriptionFormInput>,
    defaultValues: {
      name: "",
      category: undefined,
      amount: undefined,
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

  const onSubmit = async (data: CreateSubscriptionFormInput) => {
    try {
      await createSubscription.mutateAsync({
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
      });
      toast.success("Subscription created successfully");
      router.push("/subscriptions");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create subscription");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Subscription</h1>
          <p className="text-muted-foreground">Add a new recurring subscription</p>
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
                  onClick={() => router.push("/subscriptions")}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createSubscription.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createSubscription.isPending ? "Creating..." : "Create Subscription"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
