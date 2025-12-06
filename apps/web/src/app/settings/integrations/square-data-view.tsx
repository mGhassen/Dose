"use client";

import { useState } from 'react';
import {
  useSquareLocations,
  useSquareOrders,
  useSquarePayments,
  useSquareCatalog,
} from '@kit/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Badge } from '@kit/ui/badge';
import {
  Store,
  ShoppingCart,
  CreditCard,
  Package,
  Loader2,
  RefreshCw,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { formatDateTime } from '@kit/lib/date-format';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';

interface SquareDataViewProps {
  integrationId: string;
}

export default function SquareDataView({ integrationId }: SquareDataViewProps) {
  const [activeTab, setActiveTab] = useState('locations');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const { data: locations, isLoading: locationsLoading } = useSquareLocations(integrationId);
  const { data: orders, isLoading: ordersLoading, refetch: refetchOrders } = useSquareOrders(
    integrationId,
    {
      query: {
        filter: {
          date_time_filter: {
            created_at: {
              start_at: dateRange.start,
              end_at: dateRange.end,
            },
          },
        },
      },
    }
  );
  const { data: payments, isLoading: paymentsLoading, refetch: refetchPayments } = useSquarePayments(
    integrationId,
    {
      begin_time: dateRange.start,
      end_time: dateRange.end,
    }
  );
  const { data: catalog, isLoading: catalogLoading } = useSquareCatalog(integrationId, {
    types: ['ITEM', 'ITEM_VARIATION', 'CATEGORY'],
  });

  const formatMoney = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100); // Square amounts are in cents
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="locations">
            <Store className="w-4 h-4 mr-2" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="w-4 h-4 mr-2" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="catalog">
            <Package className="w-4 h-4 mr-2" />
            Catalog
          </TabsTrigger>
        </TabsList>

        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle>Square Locations</CardTitle>
              <CardDescription>Your Square business locations</CardDescription>
            </CardHeader>
            <CardContent>
              {locationsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : locations && locations.length > 0 ? (
                <div className="space-y-4">
                  {locations.map((location) => (
                    <div key={location.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{location.name}</h3>
                          {location.address && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {[
                                location.address.address_line_1,
                                location.address.locality,
                                location.address.administrative_district_level_1,
                                location.address.postal_code,
                              ]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          )}
                          {location.timezone && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Timezone: {location.timezone}
                            </p>
                          )}
                        </div>
                        {location.status && (
                          <Badge variant={location.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {location.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No locations found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Square Orders</CardTitle>
                  <CardDescription>Orders from your Square POS</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchOrders()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  />
                </div>
              </div>

              {ordersLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : orders?.orders && orders.orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.orders.map((order) => (
                    <div key={order.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">Order {order.reference_id || order.id}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatDateTime(order.created_at)}
                          </p>
                        </div>
                        <Badge variant={order.state === 'COMPLETED' ? 'default' : 'secondary'}>
                          {order.state}
                        </Badge>
                      </div>
                      {order.net_amounts?.total_money && (
                        <div className="flex items-center gap-2 mt-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">
                            {formatMoney(
                              order.net_amounts.total_money.amount,
                              order.net_amounts.total_money.currency
                            )}
                          </span>
                        </div>
                      )}
                      {order.line_items && order.line_items.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-medium mb-2">Items:</p>
                          <ul className="space-y-1">
                            {order.line_items.slice(0, 3).map((item, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground">
                                {item.quantity}x {item.name || 'Unknown Item'}
                                {item.total_money && (
                                  <span className="ml-2">
                                    {formatMoney(
                                      item.total_money.amount,
                                      item.total_money.currency
                                    )}
                                  </span>
                                )}
                              </li>
                            ))}
                            {order.line_items.length > 3 && (
                              <li className="text-sm text-muted-foreground">
                                +{order.line_items.length - 3} more items
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No orders found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Square Payments</CardTitle>
                  <CardDescription>Payment transactions from Square</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchPayments()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  />
                </div>
              </div>

              {paymentsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : payments?.payments && payments.payments.length > 0 ? (
                <div className="space-y-4">
                  {payments.payments.map((payment) => (
                    <div key={payment.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">Payment {payment.id.slice(-8)}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatDateTime(payment.created_at)}
                          </p>
                        </div>
                        <Badge variant={payment.status === 'COMPLETED' ? 'default' : 'secondary'}>
                          {payment.status}
                        </Badge>
                      </div>
                      {payment.amount_money && (
                        <div className="flex items-center gap-2 mt-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">
                            {formatMoney(
                              payment.amount_money.amount,
                              payment.amount_money.currency
                            )}
                          </span>
                        </div>
                      )}
                      {payment.card_details?.card && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Card: {payment.card_details.card.card_brand} ••••{' '}
                          {payment.card_details.card.last_4}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No payments found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catalog">
          <Card>
            <CardHeader>
              <CardTitle>Square Catalog</CardTitle>
              <CardDescription>Items, variations, and categories from your Square catalog</CardDescription>
            </CardHeader>
            <CardContent>
              {catalogLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : catalog?.objects && catalog.objects.length > 0 ? (
                <div className="space-y-4">
                  {catalog.objects.map((item) => (
                    <div key={item.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">
                            {item.item_data?.name ||
                              item.category_data?.name ||
                              item.item_variation_data?.name ||
                              'Unknown'}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Type: {item.type}
                          </p>
                          {item.item_data?.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.item_data.description}
                            </p>
                          )}
                          {item.item_variation_data?.price_money && (
                            <p className="text-sm font-medium mt-2">
                              {formatMoney(
                                item.item_variation_data.price_money.amount,
                                item.item_variation_data.price_money.currency
                              )}
                            </p>
                          )}
                        </div>
                        {item.is_deleted && (
                          <Badge variant="secondary">Deleted</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No catalog items found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

