"use client";

import { useState, useMemo } from 'react';
import {
  useSquareLocations,
  useSquareOrders,
  useSquarePayments,
  useSquareCatalog,
} from '@kit/hooks';
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
import DataTable from '@kit/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';

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

  // Column definitions for Locations
  const locationsColumns: ColumnDef<any>[] = useMemo(() => [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Name',
    },
    {
      id: 'address',
      accessorKey: 'address',
      header: 'Address',
      cell: ({ row }) => {
        const addr = row.original.address;
        if (!addr) return '-';
        return [
          addr.address_line_1,
          addr.locality,
          addr.administrative_district_level_1,
          addr.postal_code,
        ].filter(Boolean).join(', ') || '-';
      },
    },
    {
      id: 'country',
      accessorKey: 'address.country',
      header: 'Country',
    },
    {
      id: 'timezone',
      accessorKey: 'timezone',
      header: 'Timezone',
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge variant={status === 'ACTIVE' ? 'default' : 'secondary'}>
            {status || '-'}
          </Badge>
        );
      },
    },
  ], []);

  // Column definitions for Orders
  const ordersColumns: ColumnDef<any>[] = useMemo(() => [
    {
      id: 'reference_id',
      accessorKey: 'reference_id',
      header: 'Reference ID',
      cell: ({ row }) => row.original.reference_id || row.original.id,
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: 'Created At',
      cell: ({ row }) => formatDateTime(row.original.created_at),
    },
    {
      id: 'state',
      accessorKey: 'state',
      header: 'State',
      cell: ({ row }) => (
        <Badge variant={row.original.state === 'COMPLETED' ? 'default' : 'secondary'}>
          {row.original.state || '-'}
        </Badge>
      ),
    },
    {
      id: 'total',
      accessorKey: 'net_amounts.total_money',
      header: 'Total',
      cell: ({ row }) => {
        const money = row.original.net_amounts?.total_money;
        if (!money) return '-';
        return formatMoney(money.amount, money.currency);
      },
    },
    {
      id: 'item_count',
      accessorKey: 'line_items',
      header: 'Items',
      cell: ({ row }) => row.original.line_items?.length || 0,
    },
    {
      id: 'location_id',
      accessorKey: 'location_id',
      header: 'Location ID',
    },
  ], []);

  // Column definitions for Payments
  const paymentsColumns: ColumnDef<any>[] = useMemo(() => [
    {
      id: 'id',
      accessorKey: 'id',
      header: 'Payment ID',
      cell: ({ row }) => row.original.id.slice(-8),
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: 'Created At',
      cell: ({ row }) => formatDateTime(row.original.created_at),
    },
    {
      id: 'amount',
      accessorKey: 'amount_money',
      header: 'Amount',
      cell: ({ row }) => {
        const money = row.original.amount_money;
        if (!money) return '-';
        return formatMoney(money.amount, money.currency);
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'COMPLETED' ? 'default' : 'secondary'}>
          {row.original.status || '-'}
        </Badge>
      ),
    },
    {
      id: 'payment_method',
      accessorKey: 'source_type',
      header: 'Payment Method',
    },
    {
      id: 'card_last_4',
      accessorKey: 'card_details.card.last_4',
      header: 'Card Last 4',
      cell: ({ row }) => {
        const last4 = row.original.card_details?.card?.last_4;
        return last4 ? `•••• ${last4}` : '-';
      },
    },
    {
      id: 'order_id',
      accessorKey: 'order_id',
      header: 'Order ID',
    },
  ], []);

  // Column definitions for Catalog
  const catalogColumns: ColumnDef<any>[] = useMemo(() => [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const item = row.original;
        return item.item_data?.name ||
          item.category_data?.name ||
          item.item_variation_data?.name ||
          'Unknown';
      },
    },
    {
      id: 'type',
      accessorKey: 'type',
      header: 'Type',
    },
    {
      id: 'description',
      accessorKey: 'item_data.description',
      header: 'Description',
    },
    {
      id: 'price',
      accessorKey: 'item_variation_data.price_money',
      header: 'Price',
      cell: ({ row }) => {
        const money = row.original.item_variation_data?.price_money;
        if (!money) return '-';
        return formatMoney(money.amount, money.currency);
      },
    },
    {
      id: 'sku',
      accessorKey: 'item_variation_data.sku',
      header: 'SKU',
    },
    {
      id: 'category_id',
      accessorKey: 'item_data.category_id',
      header: 'Category ID',
    },
    {
      id: 'is_deleted',
      accessorKey: 'is_deleted',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_deleted ? 'secondary' : 'default'}>
          {row.original.is_deleted ? 'Deleted' : 'Active'}
        </Badge>
      ),
    },
  ], []);

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
          <DataTable
            data={locations || []}
            columns={locationsColumns}
            loading={locationsLoading}
            title="Square Locations"
            description="Your Square business locations"
            exportButton={locations && locations.length > 0 ? {
              onClick: handleExportLocations,
              label: 'Export CSV'
            } : undefined}
            searchKey="name"
            searchPlaceholder="Search locations..."
          />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
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

          {activeTab === 'orders' && (!locations || locations.length === 0) ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-2">No locations found. Please sync locations first.</p>
              {onSync && (
                <Button variant="outline" size="sm" onClick={() => onSync('locations')}>
                  <MapPin className="w-4 h-4 mr-2" />
                  Sync Locations
                </Button>
              )}
            </div>
          ) : (
            <DataTable
              data={orders?.orders || []}
              columns={ordersColumns}
              loading={ordersLoading || (activeTab === 'orders' && locationsLoading)}
              title="Square Orders"
              description="Orders from your Square POS"
              exportButton={orders?.orders && orders.orders.length > 0 ? {
                onClick: handleExportOrders,
                label: 'Export CSV'
              } : undefined}
              refreshButton={refetchOrders ? {
                onClick: () => refetchOrders()
              } : undefined}
              searchKey="reference_id"
              searchPlaceholder="Search orders..."
            />
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
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

          <DataTable
            data={payments?.payments || []}
            columns={paymentsColumns}
            loading={paymentsLoading}
            title="Square Payments"
            description="Payment transactions from Square"
            exportButton={payments?.payments && payments.payments.length > 0 ? {
              onClick: handleExportPayments,
              label: 'Export CSV'
            } : undefined}
            refreshButton={refetchPayments ? {
              onClick: () => refetchPayments()
            } : undefined}
            searchKey="id"
            searchPlaceholder="Search payments..."
          />
        </TabsContent>

        <TabsContent value="catalog">
          <DataTable
            data={catalog?.objects || []}
            columns={catalogColumns}
            loading={catalogLoading}
            title="Square Catalog"
            description="Items, variations, and categories from your Square catalog"
            exportButton={catalog?.objects && catalog.objects.length > 0 ? {
              onClick: handleExportCatalog,
              label: 'Export CSV'
            } : undefined}
            searchKey="name"
            searchPlaceholder="Search catalog..."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

