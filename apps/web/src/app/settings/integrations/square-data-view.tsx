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
  Download,
  MapPin,
} from 'lucide-react';
import { formatDateTime } from '@kit/lib/date-format';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@kit/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

interface SquareDataViewProps {
  integrationId: string;
  onSync?: (syncType: 'orders' | 'payments' | 'catalog' | 'locations' | 'full') => void;
  isSyncing?: boolean;
}

export default function SquareDataView({ integrationId, onSync, isSyncing }: SquareDataViewProps) {
  const [activeTab, setActiveTab] = useState('locations');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Fetch data automatically when tab is active
  // Always fetch locations first (needed for orders)
  const { data: locations, isLoading: locationsLoading, error: locationsError } = useSquareLocations(integrationId, {
    enabled: activeTab === 'locations' || activeTab === 'orders', // Also fetch when orders tab is active
  });
  
  // Get location IDs from locations data or use empty array
  const locationIds = locations && locations.length > 0 ? locations.map((loc: any) => loc.id) : [];
  
  const { data: orders, isLoading: ordersLoading, refetch: refetchOrders, error: ordersError } = useSquareOrders(
    integrationId,
    {
      location_ids: locationIds.length > 0 ? locationIds : undefined,
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
    },
    {
      enabled: activeTab === 'orders' && locationIds.length > 0, // Only fetch orders if we have location IDs
    }
  );
  const { data: payments, isLoading: paymentsLoading, refetch: refetchPayments, error: paymentsError } = useSquarePayments(
    integrationId,
    {
      begin_time: dateRange.start,
      end_time: dateRange.end,
    },
    {
      enabled: activeTab === 'payments',
    }
  );
  const { data: catalog, isLoading: catalogLoading, error: catalogError } = useSquareCatalog(
    integrationId,
    {
      types: ['ITEM', 'ITEM_VARIATION', 'CATEGORY'],
    },
    {
      enabled: activeTab === 'catalog',
    }
  );

  const formatMoney = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100); // Square amounts are in cents
  };

  const exportToCsv = (data: any[], filename: string, headers: string[], getRow: (item: any) => string[]) => {
    const csv = [
      headers.join(','),
      ...data.map(item => getRow(item).map(cell => {
        // Escape commas and quotes in CSV
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportLocations = () => {
    const locationsList = locations || [];
    if (locationsList.length === 0) return;
    
    exportToCsv(
      locationsList,
      `square-locations-${new Date().toISOString().split('T')[0]}.csv`,
      ['ID', 'Name', 'Address', 'City', 'State', 'Postal Code', 'Country', 'Timezone', 'Status'],
      (location) => [
        location.id,
        location.name || '',
        location.address?.address_line_1 || '',
        location.address?.locality || '',
        location.address?.administrative_district_level_1 || '',
        location.address?.postal_code || '',
        location.address?.country || '',
        location.timezone || '',
        location.status || '',
      ]
    );
  };

  const handleExportOrders = () => {
    if (!orders?.orders || orders.orders.length === 0) return;
    
    exportToCsv(
      orders.orders,
      `square-orders-${new Date().toISOString().split('T')[0]}.csv`,
      ['ID', 'Reference ID', 'Location ID', 'Created At', 'Updated At', 'State', 'Total Amount', 'Currency', 'Item Count'],
      (order) => [
        order.id,
        order.reference_id || '',
        order.location_id || '',
        order.created_at || '',
        order.updated_at || '',
        order.state || '',
        order.net_amounts?.total_money?.amount?.toString() || '0',
        order.net_amounts?.total_money?.currency || 'USD',
        order.line_items?.length?.toString() || '0',
      ]
    );
  };

  const handleExportPayments = () => {
    if (!payments?.payments || payments.payments.length === 0) return;
    
    exportToCsv(
      payments.payments,
      `square-payments-${new Date().toISOString().split('T')[0]}.csv`,
      ['ID', 'Location ID', 'Order ID', 'Created At', 'Amount', 'Currency', 'Status', 'Payment Method', 'Card Last 4'],
      (payment) => [
        payment.id,
        payment.location_id || '',
        payment.order_id || '',
        payment.created_at || '',
        payment.amount_money?.amount?.toString() || '0',
        payment.amount_money?.currency || 'USD',
        payment.status || '',
        payment.source_type || '',
        payment.card_details?.card?.last_4 || '',
      ]
    );
  };

  const handleExportCatalog = () => {
    if (!catalog?.objects || catalog.objects.length === 0) return;
    
    exportToCsv(
      catalog.objects,
      `square-catalog-${new Date().toISOString().split('T')[0]}.csv`,
      ['ID', 'Type', 'Name', 'Description', 'Price', 'Currency', 'SKU', 'Category ID', 'Is Deleted'],
      (item) => [
        item.id,
        item.type || '',
        item.item_data?.name || item.category_data?.name || item.item_variation_data?.name || '',
        item.item_data?.description || '',
        item.item_variation_data?.price_money?.amount?.toString() || '0',
        item.item_variation_data?.price_money?.currency || 'USD',
        item.item_variation_data?.sku || '',
        item.item_data?.category_id || '',
        item.is_deleted ? 'Yes' : 'No',
      ]
    );
  };

  return (
    <div className="space-y-4">
      {/* Sync Menu */}
      {onSync && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Square Data</h3>
            <p className="text-sm text-muted-foreground">View and manage your Square POS data</p>
          </div>
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isSyncing}>
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Data
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => onSync('full')} disabled={isSyncing}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync All Data
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onSync('orders')} disabled={isSyncing}>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Sync Orders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSync('payments')} disabled={isSyncing}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Sync Payments
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSync('catalog')} disabled={isSyncing}>
                  <Package className="w-4 h-4 mr-2" />
                  Sync Catalog
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSync('locations')} disabled={isSyncing}>
                  <MapPin className="w-4 h-4 mr-2" />
                  Sync Locations
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )}
      
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Square Locations</CardTitle>
                  <CardDescription>Your Square business locations</CardDescription>
                </div>
                {locations && locations.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleExportLocations}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {locationsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : locations && locations.length > 0 ? (
                <div className="space-y-4">
                  {locations.map((location: any) => (
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
                <div className="flex gap-2">
                  {orders?.orders && orders.orders.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleExportOrders}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => refetchOrders()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
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

              {ordersLoading || (activeTab === 'orders' && locationsLoading) ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : activeTab === 'orders' && (!locations || locations.length === 0) ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-2">No locations found. Please sync locations first.</p>
                  {onSync && (
                    <Button variant="outline" size="sm" onClick={() => onSync('locations')}>
                      <MapPin className="w-4 h-4 mr-2" />
                      Sync Locations
                    </Button>
                  )}
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
                <div className="flex gap-2">
                  {payments?.payments && payments.payments.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleExportPayments}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => refetchPayments()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Square Catalog</CardTitle>
                  <CardDescription>Items, variations, and categories from your Square catalog</CardDescription>
                </div>
                {catalog?.objects && catalog.objects.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleExportCatalog}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                )}
              </div>
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

