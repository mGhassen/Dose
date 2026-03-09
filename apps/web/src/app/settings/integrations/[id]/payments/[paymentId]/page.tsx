"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/app-layout';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { ArrowLeft, Loader2, CreditCard, ExternalLink } from 'lucide-react';
import { useSquarePayment } from '@kit/hooks';
import { formatDateTime } from '@kit/lib/date-format';
import type { SquarePayment } from '@kit/types';

function formatMoney(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format((amount ?? 0) / 100);
}

export default function SquarePaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string; paymentId: string }>;
}) {
  const router = useRouter();
  const [resolved, setResolved] = useState<{ id: string; paymentId: string } | null>(null);

  useEffect(() => {
    params.then(setResolved);
  }, [params]);

  const { data: payment, isLoading, error } = useSquarePayment(
    resolved?.id ?? '',
    resolved?.paymentId ?? ''
  );

  if (!resolved) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/settings/integrations/${resolved.id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to integration
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">
                Failed to load payment: {(error as Error).message}
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && payment && (
          <PaymentDetail payment={payment} integrationId={resolved.id} />
        )}

        {!isLoading && !error && !payment && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Payment not found.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function PaymentDetail({
  payment,
  integrationId,
}: {
  payment: SquarePayment;
  integrationId: string;
}) {
  const router = useRouter();
  const card = payment.card_details?.card;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Payment {payment.id.slice(-12)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(payment.created_at)}
            </p>
          </div>
        </div>
        <Badge variant={payment.status === 'COMPLETED' ? 'default' : 'secondary'}>
          {payment.status}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment ID</span>
              <span className="font-mono text-xs break-all">{payment.id}</span>
            </div>
            {payment.reference_id && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference</span>
                <span>{payment.reference_id}</span>
              </div>
            )}
            {payment.receipt_number && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receipt #</span>
                <span>{payment.receipt_number}</span>
              </div>
            )}
            {payment.location_id && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location ID</span>
                <span className="font-mono text-xs">{payment.location_id}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Source</span>
              <span className="capitalize">{payment.source_type ?? '-'}</span>
            </div>
            {payment.amount_money && (
              <div className="flex justify-between pt-2 border-t font-medium">
                <span>Amount</span>
                <span>{formatMoney(payment.amount_money.amount, payment.amount_money.currency)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {card && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {card.card_brand && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brand</span>
                  <span className="capitalize">{card.card_brand}</span>
                </div>
              )}
              {card.last_4 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last 4</span>
                  <span>•••• {card.last_4}</span>
                </div>
              )}
              {card.cardholder_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cardholder</span>
                  <span>{card.cardholder_name}</span>
                </div>
              )}
              {(card.exp_month != null || card.exp_year != null) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expires</span>
                  <span>
                    {card.exp_month != null && card.exp_year != null
                      ? `${String(card.exp_month).padStart(2, '0')}/${card.exp_year}`
                      : '-'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {(payment.order_id || payment.receipt_url || payment.note) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {payment.order_id && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Order</span>
                <Button
                  variant="link"
                  className="h-auto p-0 font-mono text-xs"
                  onClick={() =>
                    router.push(
                      `/settings/integrations/${integrationId}/orders/${payment.order_id}`
                    )
                  }
                >
                  {payment.order_id}
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </div>
            )}
            {payment.receipt_url && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Receipt</span>
                <a
                  href={payment.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs flex items-center gap-1"
                >
                  Open receipt
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {payment.note && (
              <div>
                <span className="text-muted-foreground block mb-1">Note</span>
                <p className="text-foreground">{payment.note}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
