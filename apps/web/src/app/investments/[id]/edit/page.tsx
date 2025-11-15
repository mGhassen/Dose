"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useInvestmentById, useUpdateInvestment } from "@kit/hooks";
import { toast } from "sonner";
import type { InvestmentType, DepreciationMethod } from "@kit/types";

interface EditInvestmentPageProps {
  params: Promise<{ id: string }>;
}

export default function EditInvestmentPage({ params }: EditInvestmentPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { data: investment, isLoading } = useInvestmentById(resolvedParams?.id || "");
  const updateInvestment = useUpdateInvestment();
  
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
    params.then(setResolvedParams);
  }, [params]);

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

    if (!resolvedParams?.id) return;

    try {
      await updateInvestment.mutateAsync({
        id: resolvedParams.id,
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
      router.push(`/investments/${resolvedParams.id}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update investment");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Investment</h1>
          <p className="text-muted-foreground">Update investment information</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Investment Information</CardTitle>
            <CardDescription>Update the details for this investment</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Kitchen Equipment"
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
                      <SelectValue placeholder="Select type" />
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
                    placeholder="0.00"
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
                    placeholder="e.g., 60"
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
                      <SelectValue placeholder="Select method" />
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
                    placeholder="0.00"
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
                  placeholder="Additional notes about this investment"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/investments/${resolvedParams.id}`)}
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
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

