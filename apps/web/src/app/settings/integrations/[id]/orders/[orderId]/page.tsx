"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/app-layout';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { ArrowLeft, Loader2, ShoppingCart } from 'lucide-react';
import { useSquareOrder } from '@kit/hooks';
import { formatDateTime } from '@kit/lib/date-format';
import type { SquareOrder } from '@kit/types';

function formatMoney(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format((amount ?? 0) / 100);
}

export default function SquareOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string; orderId: string }>;
}) {
  const router = useRouter();
  const [resolved, setResolved] = useState<{ id: string; orderId: string } | null>(null);

  useEffect(() => {
    params.then(setResolved);
  }, [params]);

  const { data: order, isLoading, error } = useSquareOrder(
    resolved?.id ?? '',
    resolved?.orderId ?? ''
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
                Failed to load order: {(error as Error).message}
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && order && (
          <OrderDetail order={order} />
        )}

        {!isLoading && !error && !order && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Order not found.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function OrderDetail({ order }: { order: SquareOrder }) {
  const totalMoney = order.net_amounts?.total_money ?? order.total_money;
  const taxMoney = order.net_amounts?.tax_money ?? order.total_tax_money;
  const discountMoney = order.net_amounts?.discount_money ?? order.total_discount_money;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ShoppingCart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Order {order.reference_id || order.id}
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(order.created_at)}
            </p>
          </div>
        </div>
        <Badge variant={order.state === 'COMPLETED' ? 'default' : 'secondary'}>
          {order.state}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order ID</span>
              <span className="font-mono">{order.id}</span>
            </div>
            {order.reference_id && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference</span>
                <span>{order.reference_id}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location ID</span>
              <span className="font-mono text-xs">{order.location_id}</span>
            </div>
            {totalMoney && (
              <div className="flex justify-between pt-2 border-t font-medium">
                <span>Total</span>
                <span>{formatMoney(totalMoney.amount, totalMoney.currency)}</span>
              </div>
            )}
            {taxMoney && Number(taxMoney.amount) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>{formatMoney(taxMoney.amount, taxMoney.currency)}</span>
              </div>
            )}
            {discountMoney && Number(discountMoney.amount) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span>-{formatMoney(discountMoney.amount, discountMoney.currency)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {(order.taxes?.length ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Taxes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {order.taxes!.map((t, i) => (
                  <li key={t.uid ?? i} className="flex justify-between">
                    <span>{t.name ?? 'Tax'}</span>
                    {t.applied_money && (
                      <span>{formatMoney(t.applied_money.amount, t.applied_money.currency)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent>
          {!order.line_items?.length ? (
            <p className="text-sm text-muted-foreground">No line items.</p>
          ) : (
            <div className="space-y-3">
              {order.line_items.map((item, i) => (
                <div
                  key={item.uid ?? i}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{item.name ?? 'Item'}</p>
                    {item.variation_name && (
                      <p className="text-xs text-muted-foreground">{item.variation_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  {item.total_money && (
                    <span>{formatMoney(item.total_money.amount, item.total_money.currency)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
