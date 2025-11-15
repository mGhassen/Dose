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
import { useActualPayments, useUpdateActualPayment } from "@kit/hooks";
import { toast } from "sonner";

interface EditPaymentPageProps {
  params: Promise<{ id: string }>;
}

export default function EditPaymentPage({ params }: EditPaymentPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { data: payments } = useActualPayments();
  const updatePayment = useUpdateActualPayment();
  
  const payment = payments?.find(p => p.id === parseInt(resolvedParams?.id || '0'));
  
  const [formData, setFormData] = useState({
    paymentDate: "",
    amount: "",
    notes: "",
    isPaid: true,
  });

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (payment) {
      setFormData({
        paymentDate: payment.paymentDate.split('T')[0],
        amount: payment.amount.toString(),
        notes: payment.notes || "",
        isPaid: payment.isPaid,
      });
    }
  }, [payment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.paymentDate || !formData.amount || !resolvedParams?.id) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await updatePayment.mutateAsync({
        id: resolvedParams.id,
        data: {
          paymentDate: formData.paymentDate,
          amount: parseFloat(formData.amount),
          notes: formData.notes || null,
          isPaid: formData.isPaid,
          paidDate: formData.isPaid ? formData.paymentDate : null,
        },
      });
      toast.success("Payment updated successfully");
      router.push(payment?.direction === 'input' ? '/payments/input' : '/payments/output');
    } catch (error: any) {
      toast.error(error?.message || "Failed to update payment");
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!resolvedParams) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  if (!payment) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Payment Not Found</h1>
            <p className="text-muted-foreground">The payment you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/payments/output')}>Back to Payments</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Payment</h1>
          <p className="text-muted-foreground">
            Update {payment.direction === 'input' ? 'input' : 'output'} payment information
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
            <CardDescription>Update the details for this payment</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  onClick={() => router.push(payment.direction === 'input' ? '/payments/input' : '/payments/output')}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePayment.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updatePayment.isPending ? "Updating..." : "Update Payment"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

