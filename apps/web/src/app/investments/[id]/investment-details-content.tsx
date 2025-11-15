"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Badge } from "@kit/ui/badge";
import { Save, X, Trash2, TrendingDown } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useInvestmentById, useUpdateInvestment, useDeleteInvestment, useDepreciationSchedule } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import type { InvestmentType, DepreciationMethod } from "@kit/types";

interface InvestmentDetailsContentProps {
  investmentId: string;
}

export default function InvestmentDetailsContent({ investmentId }: InvestmentDetailsContentProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const { data: investment, isLoading } = useInvestmentById(investmentId);
  const { data: depreciation } = useDepreciationSchedule(investmentId);
  const updateInvestment = useUpdateInvestment();
  const deleteMutation = useDeleteInvestment();
  
  const [formData, setFormData] = useState({
    name: "",
    type: "" as InvestmentType | "",
    amount: "",
    purchaseDate: "",
    usefulLifeMonths: "",
    depreciationMethod: "" as DepreciationMethod | "",
    residualValue: "",
    description: "",
  });

  useEffect(() => {
    if (investment) {
      setFormData({
        name: investment.name,
        type: investment.type,
        amount: investment.amount.toString(),
        purchaseDate: investment.purchaseDate.split('T')[0],
        usefulLifeMonths: investment.usefulLifeMonths.toString(),
        depreciationMethod: investment.depreciationMethod,
        residualValue: investment.residualValue.toString(),
        description: investment.description || "",
      });
    }
  }, [investment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.type || !formData.amount || !formData.purchaseDate || 
        !formData.usefulLifeMonths || !formData.depreciationMethod || formData.residualValue === undefined) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await updateInvestment.mutateAsync({
        id: investmentId,
        data: {
          name: formData.name,
          type: formData.type as InvestmentType,
          amount: parseFloat(formData.amount),
          purchaseDate: formData.purchaseDate,
          usefulLifeMonths: parseInt(formData.usefulLifeMonths),
          depreciationMethod: formData.depreciationMethod as DepreciationMethod,
          residualValue: parseFloat(formData.residualValue),
          description: formData.description || undefined,
        },
      });
      toast.success("Investment updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update investment");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this investment? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(Number(investmentId));
      toast.success("Investment deleted successfully");
      router.push('/investments');
    } catch (error) {
      toast.error("Failed to delete investment");
      console.error(error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  if (!investment) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Investment Not Found</h1>
            <p className="text-muted-foreground">The investment you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/investments')}>Back to Investments</Button>
        </div>
      </AppLayout>
    );
  }

  const typeLabels: Record<InvestmentType, string> = {
    equipment: "Equipment",
    renovation: "Renovation",
    technology: "Technology",
    vehicle: "Vehicle",
    other: "Other",
  };

  const methodLabels: Record<DepreciationMethod, string> = {
    straight_line: "Straight Line",
    declining_balance: "Declining Balance",
    units_of_production: "Units of Production",
  };

  const currentBookValue = depreciation && depreciation.length > 0
    ? depreciation[depreciation.length - 1].bookValue
    : investment.amount;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Investment" : investment.name}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update investment information" : "Investment details and information"}
            </p>
          </div>
          {!isEditing && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/investments/${investmentId}/depreciation`)}
              >
                <TrendingDown className="mr-2 h-4 w-4" />
                View Depreciation
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          )}
        </div>

        {/* Form/Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Investment" : "Investment Information"}</CardTitle>
            <CardDescription>
              {isEditing ? "Update the details for this investment" : "View and manage investment details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>

                  {/* Type */}
                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => handleInputChange('type', value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="renovation">Renovation</SelectItem>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="vehicle">Vehicle</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      required
                    />
                  </div>

                  {/* Purchase Date */}
                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Purchase Date *</Label>
                    <Input
                      id="purchaseDate"
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                      required
                    />
                  </div>

                  {/* Useful Life */}
                  <div className="space-y-2">
                    <Label htmlFor="usefulLifeMonths">Useful Life (Months) *</Label>
                    <Input
                      id="usefulLifeMonths"
                      type="number"
                      value={formData.usefulLifeMonths}
                      onChange={(e) => handleInputChange('usefulLifeMonths', e.target.value)}
                      required
                    />
                  </div>

                  {/* Depreciation Method */}
                  <div className="space-y-2">
                    <Label htmlFor="depreciationMethod">Depreciation Method *</Label>
                    <Select
                      value={formData.depreciationMethod}
                      onValueChange={(value) => handleInputChange('depreciationMethod', value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="straight_line">Straight Line</SelectItem>
                        <SelectItem value="declining_balance">Declining Balance</SelectItem>
                        <SelectItem value="units_of_production">Units of Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Residual Value */}
                  <div className="space-y-2">
                    <Label htmlFor="residualValue">Residual Value *</Label>
                    <Input
                      id="residualValue"
                      type="number"
                      step="0.01"
                      value={formData.residualValue}
                      onChange={(e) => handleInputChange('residualValue', e.target.value)}
                      required
                    />
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
                    onClick={() => setIsEditing(false)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateInvestment.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateInvestment.isPending ? "Updating..." : "Update Investment"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-base font-semibold mt-1">{investment.name}</p>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {typeLabels[investment.type] || investment.type}
                      </Badge>
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Purchase Amount</label>
                    <p className="text-base font-semibold mt-1">{formatCurrency(investment.amount)}</p>
                  </div>

                  {/* Purchase Date */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Purchase Date</label>
                    <p className="text-base mt-1">{formatDate(investment.purchaseDate)}</p>
                  </div>

                  {/* Useful Life */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Useful Life</label>
                    <p className="text-base mt-1">{investment.usefulLifeMonths} months</p>
                  </div>

                  {/* Depreciation Method */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Depreciation Method</label>
                    <p className="text-base mt-1">{methodLabels[investment.depreciationMethod] || investment.depreciationMethod}</p>
                  </div>

                  {/* Residual Value */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Residual Value</label>
                    <p className="text-base mt-1">{formatCurrency(investment.residualValue)}</p>
                  </div>

                  {/* Current Book Value */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Current Book Value</label>
                    <p className="text-base font-semibold mt-1 text-primary">{formatCurrency(currentBookValue)}</p>
                  </div>
                </div>

                {/* Depreciation Summary */}
                {depreciation && depreciation.length > 0 && (
                  <div className="pt-4 border-t">
                    <label className="text-sm font-medium text-muted-foreground">Depreciation Status</label>
                    <p className="text-sm mt-1 text-muted-foreground">
                      {depreciation.length} month(s) of depreciation calculated. 
                      Total accumulated: {formatCurrency(depreciation[depreciation.length - 1].accumulatedDepreciation)}
                    </p>
                  </div>
                )}

                {/* Description */}
                {investment.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-base mt-1 whitespace-pre-wrap">{investment.description}</p>
                  </div>
                )}

                {/* Metadata */}
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Created:</span> {formatDate(investment.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span> {formatDate(investment.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

