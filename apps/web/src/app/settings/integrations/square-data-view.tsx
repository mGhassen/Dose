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
import DataTablePage from '@/components/data-table-page';
import { ColumnDef } from '@tanstack/react-table';

interface SquareDataViewProps {
  integrationId: string;
  onSync?: (syncType: 'orders' | 'payments' | 'catalog' | 'locations' | 'full') => void;
  isSyncing?: boolean;
}

export default function SquareDataView({ integrationId, onSync, isSyncing }: SquareDataViewProps) {
  const [activeTab, setActiveTab] = useState('locations');

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
      // No date filter - fetch all data, filtering will be done in the DataTable
    },
    {
      enabled: activeTab === 'orders' && locationIds.length > 0, // Only fetch orders if we have location IDs
    }
  );
  const { data: payments, isLoading: paymentsLoading, refetch: refetchPayments, error: paymentsError } = useSquarePayments(
    integrationId,
    {
      // No date filter - fetch all data, filtering will be done in the DataTable
    },
    {
      enabled: activeTab === 'payments',
    }
  );
  const { data: catalog, isLoading: catalogLoading, error: catalogError } = useSquareCatalog(
    integrationId,
    {
      types: ['ITEM', 'ITEM_VARIATION', 'CATEGORY', 'MODIFIER', 'MODIFIER_LIST', 'TAX'],
    },
    {
      enabled: activeTab === 'catalog',
    }
  );

  // Process catalog data to merge items with their variations, categories, modifiers, etc.
  const processedCatalogData = useMemo(() => {
    if (!catalog?.objects || catalog.objects.length === 0) return [];

    const objects = catalog.objects;
    
    // Create lookup maps
    const itemsMap = new Map<string, any>();
    const variationsMap = new Map<string, any[]>();
    const categoriesMap = new Map<string, any>();
    const modifierListsMap = new Map<string, any>();
    const modifiersMap = new Map<string, any[]>();
    const taxesMap = new Map<string, any>();

    // First pass: categorize all objects
    objects.forEach((obj: any) => {
      switch (obj.type) {
        case 'ITEM':
          itemsMap.set(obj.id, obj);
          // Initialize variations array
          variationsMap.set(obj.id, []);
          break;
        case 'ITEM_VARIATION':
          const itemId = obj.item_variation_data?.item_id;
          if (itemId) {
            if (!variationsMap.has(itemId)) {
              variationsMap.set(itemId, []);
            }
            variationsMap.get(itemId)!.push(obj);
          }
          break;
        case 'CATEGORY':
          categoriesMap.set(obj.id, obj);
          break;
        case 'MODIFIER_LIST':
          modifierListsMap.set(obj.id, obj);
          // Initialize modifiers array
          modifiersMap.set(obj.id, []);
          break;
        case 'MODIFIER':
          const modifierListId = obj.modifier_data?.modifier_list_id;
          if (modifierListId) {
            if (!modifiersMap.has(modifierListId)) {
              modifiersMap.set(modifierListId, []);
            }
            modifiersMap.get(modifierListId)!.push(obj);
          }
          break;
        case 'TAX':
          taxesMap.set(obj.id, obj);
          break;
      }
    });

    // Second pass: build merged items with all related data
    const mergedItems: any[] = [];
    
    itemsMap.forEach((item, itemId) => {
      // Get category
      const categoryId = item.item_data?.category_id;
      const category = categoryId ? categoriesMap.get(categoryId) : null;

      // Get variations
      const variations = variationsMap.get(itemId) || [];

      // Get modifier lists and their modifiers
      const modifierListInfos = item.item_data?.modifier_list_info || [];
      const modifierListsWithModifiers = modifierListInfos.map((modListInfo: any) => {
        const modListId = modListInfo.modifier_list_id;
        const modList = modifierListsMap.get(modListId);
        const modifiers = modifiersMap.get(modListId) || [];
        return {
          ...modListInfo,
          modifierList: modList,
          modifiers: modifiers,
        };
      });

      // Get taxes
      const taxIds = item.item_data?.tax_ids || [];
      const taxes = taxIds.map((taxId: string) => taxesMap.get(taxId)).filter(Boolean);

      // Create merged item
      mergedItems.push({
        id: itemId,
        type: 'ITEM',
        name: item.item_data?.name || 'Unknown',
        description: item.item_data?.description || '',
        category: category,
        categoryName: category?.category_data?.name || '',
        variations: variations,
        modifierLists: modifierListsWithModifiers,
        taxes: taxes,
        taxIds: taxIds,
        is_deleted: item.is_deleted || false,
        updated_at: item.updated_at,
        // Original item data for reference
        _original: item,
      });
    });

    return mergedItems;
  }, [catalog]);

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

  // Column definitions for Catalog (merged items)
  const catalogColumns: ColumnDef<any>[] = useMemo(() => {
    const formatMoney = (amount: number, currency: string = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount / 100); // Square amounts are in cents
    };

    return [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Item Name',
      cell: ({ row }) => {
        return <span className="font-semibold">{row.original.name}</span>;
      },
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => row.original.description || '-',
    },
    {
      id: 'category',
      accessorKey: 'categoryName',
      header: 'Category',
      cell: ({ row }) => {
        const categoryName = row.original.categoryName;
        return categoryName ? (
          <Badge variant="outline">{categoryName}</Badge>
        ) : '-';
      },
    },
    {
      id: 'variations',
      accessorKey: 'variations',
      header: 'Variations',
      cell: ({ row }) => {
        const variations = row.original.variations || [];
        if (variations.length === 0) return <span className="text-muted-foreground">No variations</span>;
        return (
          <div className="space-y-1">
            {variations.map((variation: any, idx: number) => {
              const price = variation.item_variation_data?.price_money;
              return (
                <div key={variation.id || idx} className="text-sm">
                  <span className="font-medium">{variation.item_variation_data?.name || 'Unnamed'}</span>
                  {price && (
                    <span className="ml-2 text-muted-foreground">
                      {formatMoney(price.amount, price.currency)}
                    </span>
                  )}
                  {variation.item_variation_data?.sku && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (SKU: {variation.item_variation_data.sku})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      id: 'modifier_lists',
      accessorKey: 'modifierLists',
      header: 'Modifier Lists',
      cell: ({ row }) => {
        const modifierLists = row.original.modifierLists || [];
        if (modifierLists.length === 0) return <span className="text-muted-foreground">No modifiers</span>;
        return (
          <div className="space-y-2">
            {modifierLists.map((modListInfo: any, idx: number) => {
              const modList = modListInfo.modifierList;
              const modifiers = modListInfo.modifiers || [];
              return (
                <div key={modListInfo.modifier_list_id || idx} className="text-sm border-l-2 border-yellow-400 pl-2">
                  <div className="font-medium text-yellow-700 dark:text-yellow-400">
                    {modList?.modifier_list_data?.name || 'Unnamed List'}
                  </div>
                  {modifiers.length > 0 && (
                    <div className="mt-1 space-y-0.5 ml-2">
                      {modifiers.map((modifier: any, modIdx: number) => {
                        const modPrice = modifier.modifier_data?.price_money;
                        return (
                          <div key={modifier.id || modIdx} className="text-xs text-muted-foreground">
                            • {modifier.modifier_data?.name || 'Unnamed'}
                            {modPrice && (
                              <span className="ml-1">
                                (+{formatMoney(modPrice.amount, modPrice.currency)})
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      id: 'taxes',
      accessorKey: 'taxes',
      header: 'Taxes',
      cell: ({ row }) => {
        const taxes = row.original.taxes || [];
        if (taxes.length === 0) return <span className="text-muted-foreground">No taxes</span>;
        return (
          <div className="space-y-1">
            {taxes.map((tax: any, idx: number) => (
              <Badge key={tax.id || idx} variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-200">
                {tax.tax_data?.name || 'Unnamed'}
                {tax.tax_data?.percentage && ` (${tax.tax_data.percentage}%)`}
              </Badge>
            ))}
          </div>
        );
      },
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
  ];
  }, []);

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
    if (processedCatalogData.length === 0) return;
    
    // Flatten the merged data for CSV export
    const flattenedData: any[] = [];
    
    processedCatalogData.forEach((item) => {
      // Export main item row
      const variations = item.variations || [];
      const modifierLists = item.modifierLists || [];
      const taxes = item.taxes || [];
      
      if (variations.length === 0) {
        // Item with no variations - single row
        flattenedData.push({
          item_id: item.id,
          item_name: item.name,
          description: item.description,
          category: item.categoryName,
          variation_name: '',
          variation_sku: '',
          variation_price: '',
          variation_currency: '',
          modifier_list_name: '',
          modifier_name: '',
          modifier_price: '',
          tax_name: '',
          tax_percentage: '',
          status: item.is_deleted ? 'Deleted' : 'Active',
        });
      } else {
        // Item with variations - one row per variation
        variations.forEach((variation: any) => {
          const price = variation.item_variation_data?.price_money;
          
          if (modifierLists.length === 0 && taxes.length === 0) {
            // Variation with no modifiers/taxes
            flattenedData.push({
              item_id: item.id,
              item_name: item.name,
              description: item.description,
              category: item.categoryName,
              variation_name: variation.item_variation_data?.name || '',
              variation_sku: variation.item_variation_data?.sku || variation.item_variation_data?.upc || '',
              variation_price: price?.amount?.toString() || '',
              variation_currency: price?.currency || '',
              modifier_list_name: '',
              modifier_name: '',
              modifier_price: '',
              tax_name: '',
              tax_percentage: '',
              status: item.is_deleted ? 'Deleted' : 'Active',
            });
          } else {
            // Variation with modifiers and/or taxes
            modifierLists.forEach((modListInfo: any) => {
              const modifiers = modListInfo.modifiers || [];
              if (modifiers.length === 0) {
                // Modifier list with no modifiers
                taxes.forEach((tax: any) => {
                  flattenedData.push({
                    item_id: item.id,
                    item_name: item.name,
                    description: item.description,
                    category: item.categoryName,
                    variation_name: variation.item_variation_data?.name || '',
                    variation_sku: variation.item_variation_data?.sku || variation.item_variation_data?.upc || '',
                    variation_price: price?.amount?.toString() || '',
                    variation_currency: price?.currency || '',
                    modifier_list_name: modListInfo.modifierList?.modifier_list_data?.name || '',
                    modifier_name: '',
                    modifier_price: '',
                    tax_name: tax.tax_data?.name || '',
                    tax_percentage: tax.tax_data?.percentage || '',
                    status: item.is_deleted ? 'Deleted' : 'Active',
                  });
                });
                if (taxes.length === 0) {
                  flattenedData.push({
                    item_id: item.id,
                    item_name: item.name,
                    description: item.description,
                    category: item.categoryName,
                    variation_name: variation.item_variation_data?.name || '',
                    variation_sku: variation.item_variation_data?.sku || variation.item_variation_data?.upc || '',
                    variation_price: price?.amount?.toString() || '',
                    variation_currency: price?.currency || '',
                    modifier_list_name: modListInfo.modifierList?.modifier_list_data?.name || '',
                    modifier_name: '',
                    modifier_price: '',
                    tax_name: '',
                    tax_percentage: '',
                    status: item.is_deleted ? 'Deleted' : 'Active',
                  });
                }
              } else {
                // Modifier list with modifiers
                modifiers.forEach((modifier: any) => {
                  const modPrice = modifier.modifier_data?.price_money;
                  taxes.forEach((tax: any) => {
                    flattenedData.push({
                      item_id: item.id,
                      item_name: item.name,
                      description: item.description,
                      category: item.categoryName,
                      variation_name: variation.item_variation_data?.name || '',
                      variation_sku: variation.item_variation_data?.sku || variation.item_variation_data?.upc || '',
                      variation_price: price?.amount?.toString() || '',
                      variation_currency: price?.currency || '',
                      modifier_list_name: modListInfo.modifierList?.modifier_list_data?.name || '',
                      modifier_name: modifier.modifier_data?.name || '',
                      modifier_price: modPrice?.amount?.toString() || '',
                      tax_name: tax.tax_data?.name || '',
                      tax_percentage: tax.tax_data?.percentage || '',
                      status: item.is_deleted ? 'Deleted' : 'Active',
                    });
                  });
                  if (taxes.length === 0) {
                    flattenedData.push({
                      item_id: item.id,
                      item_name: item.name,
                      description: item.description,
                      category: item.categoryName,
                      variation_name: variation.item_variation_data?.name || '',
                      variation_sku: variation.item_variation_data?.sku || variation.item_variation_data?.upc || '',
                      variation_price: price?.amount?.toString() || '',
                      variation_currency: price?.currency || '',
                      modifier_list_name: modListInfo.modifierList?.modifier_list_data?.name || '',
                      modifier_name: modifier.modifier_data?.name || '',
                      modifier_price: modPrice?.amount?.toString() || '',
                      tax_name: '',
                      tax_percentage: '',
                      status: item.is_deleted ? 'Deleted' : 'Active',
                    });
                  }
                });
              }
            });
            if (modifierLists.length === 0) {
              // No modifiers but has taxes
              taxes.forEach((tax: any) => {
                flattenedData.push({
                  item_id: item.id,
                  item_name: item.name,
                  description: item.description,
                  category: item.categoryName,
                  variation_name: variation.item_variation_data?.name || '',
                  variation_sku: variation.item_variation_data?.sku || variation.item_variation_data?.upc || '',
                  variation_price: price?.amount?.toString() || '',
                  variation_currency: price?.currency || '',
                  modifier_list_name: '',
                  modifier_name: '',
                  modifier_price: '',
                  tax_name: tax.tax_data?.name || '',
                  tax_percentage: tax.tax_data?.percentage || '',
                  status: item.is_deleted ? 'Deleted' : 'Active',
                });
              });
            }
          }
        });
      }
    });
    
    exportToCsv(
      flattenedData,
      `square-catalog-${new Date().toISOString().split('T')[0]}.csv`,
      [
        'Item ID',
        'Item Name',
        'Description',
        'Category',
        'Variation Name',
        'Variation SKU',
        'Variation Price',
        'Variation Currency',
        'Modifier List Name',
        'Modifier Name',
        'Modifier Price',
        'Tax Name',
        'Tax Percentage',
        'Status'
      ],
      (row) => [
        row.item_id,
        row.item_name,
        row.description,
        row.category,
        row.variation_name,
        row.variation_sku,
        row.variation_price,
        row.variation_currency,
        row.modifier_list_name,
        row.modifier_name,
        row.modifier_price,
        row.tax_name,
        row.tax_percentage,
        row.status,
      ]
    );
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

        <TabsContent value="locations" className="">
          <DataTablePage
            title="Square Locations"
            description="Your Square business locations"
            data={locations || []}
            columns={locationsColumns}
            loading={locationsLoading}
            onBulkExport={(data, type) => {
              const itemsToExport = type === 'selected' ? data : (locations || []);
              handleExportLocations();
            }}
            filterColumns={[
              { value: 'status', label: 'Status' },
            ]}
            sortColumns={[
              { value: 'name', label: 'Name', type: 'character varying' },
            ]}
            localStoragePrefix="square-locations"
            searchFields={['name', 'address']}
            selectable={false}
          />
        </TabsContent>

        <TabsContent value="orders" className="">
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
            <DataTablePage
              title="Square Orders"
              description="Orders from your Square POS"
              data={orders?.orders || []}
              columns={ordersColumns}
              loading={ordersLoading || (activeTab === 'orders' && locationsLoading)}
              onBulkExport={(data, type) => {
                const itemsToExport = type === 'selected' ? data : (orders?.orders || []);
                handleExportOrders();
              }}
              filterColumns={[
                { value: 'state', label: 'State' },
                { value: 'created_at', label: 'Created At' },
              ]}
              sortColumns={[
                { value: 'created_at', label: 'Created At', type: 'timestamp' },
                { value: 'reference_id', label: 'Reference ID', type: 'character varying' },
              ]}
              localStoragePrefix="square-orders"
              searchFields={['reference_id', 'id', 'location_id']}
              selectable={false}
              headerActions={
                refetchOrders ? (
                  <Button variant="outline" size="sm" onClick={() => refetchOrders()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                ) : undefined
              }
            />
          )}
        </TabsContent>

        <TabsContent value="payments" className="">
          <DataTablePage
            title="Square Payments"
            description="Payment transactions from Square"
            data={payments?.payments || []}
            columns={paymentsColumns}
            loading={paymentsLoading}
            onBulkExport={(data, type) => {
              const itemsToExport = type === 'selected' ? data : (payments?.payments || []);
              handleExportPayments();
            }}
            filterColumns={[
              { value: 'status', label: 'Status' },
              { value: 'source_type', label: 'Payment Method' },
              { value: 'created_at', label: 'Created At' },
            ]}
            sortColumns={[
              { value: 'created_at', label: 'Created At', type: 'timestamp' },
              { value: 'amount_money.amount', label: 'Amount', type: 'numeric' },
            ]}
            localStoragePrefix="square-payments"
            searchFields={['id', 'order_id', 'location_id']}
            selectable={false}
            headerActions={
              refetchPayments ? (
                <Button variant="outline" size="sm" onClick={() => refetchPayments()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              ) : undefined
            }
          />
        </TabsContent>

        <TabsContent value="catalog" className="">
          <DataTablePage
            title="Square Catalog"
            description="Items with their variations, modifiers, and taxes"
            data={processedCatalogData}
            columns={catalogColumns}
            loading={catalogLoading}
            onBulkExport={(data, type) => {
              const itemsToExport = type === 'selected' ? data : processedCatalogData;
              handleExportCatalog();
            }}
            filterColumns={[
              { value: 'categoryName', label: 'Category' },
              { value: 'is_deleted', label: 'Status' },
            ]}
            sortColumns={[
              { value: 'name', label: 'Name', type: 'character varying' },
              { value: 'categoryName', label: 'Category', type: 'character varying' },
            ]}
            localStoragePrefix="square-catalog"
            searchFields={['name', 'description', 'categoryName']}
            defaultHiddenColumns={[]}
            selectable={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

