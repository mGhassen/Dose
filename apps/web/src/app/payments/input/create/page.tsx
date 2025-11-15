"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Save, X } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useCreateActualPayment } from "@kit/hooks";
import { toast } from "sonner";

export default function CreateInputPaymentPage() {
  const router = useRouter();
  const createPayment = useCreateActualPayment();
  const [formData, setFormData] = useState({
    paymentType: "sale" as 'sale',
    referenceId: "",
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    paymentDate: new Date().toISOString().split('T')[0],
    amount: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.paymentType || !formData.referenceId || !formData.amount || !formData.paymentDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createPayment.mutateAsync({
        paymentType: formData.paymentType,
        direction: 'input',
        referenceId: parseInt(formData.referenceId),
        month: formData.month,
        paymentDate: formData.paymentDate,
        amount: parseFloat(formData.amount),
        isPaid: true,
        paidDate: formData.paymentDate,
        notes: formData.notes || undefined,
      });
      toast.success("Input payment created successfully");
      router.push('/payments/input');
    } catch (error: any) {
      toast.error(error?.message || "Failed to create payment");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Input Payment</h1>
          <p className="text-muted-foreground">Record a new input payment (money coming in)</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
            <CardDescription>Enter the details for this input payment</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payment Type */}
                <div className="space-y-2">
                  <Label htmlFor="paymentType">Payment Type *</Label>
                  <Select
                    value={formData.paymentType}
                    onValueChange={(value) => handleInputChange('paymentType', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Sale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reference ID */}
                <div className="space-y-2">
                  <Label htmlFor="referenceId">Reference ID *</Label>
                  <Input
                    id="referenceId"
                    type="number"
                    value={formData.referenceId}
                    onChange={(e) => handleInputChange('referenceId', e.target.value)}
                    placeholder="ID of sale or revenue source"
                    required
                  />
                </div>

                {/* Month */}
                <div className="space-y-2">
                  <Label htmlFor="month">Month *</Label>
                  <Input
                    id="month"
                    type="month"
                    value={formData.month}
                    onChange={(e) => handleInputChange('month', e.target.value)}
                    required
                  />
                </div>

                {/* Payment Date */}
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Payment Date *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                    required
                  />
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
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes about this payment"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/payments/input')}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createPayment.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createPayment.isPending ? "Creating..." : "Create Payment"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

