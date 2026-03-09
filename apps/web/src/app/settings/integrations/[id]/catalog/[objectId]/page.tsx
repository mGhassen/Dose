"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/app-layout';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { ArrowLeft, Loader2, Package } from 'lucide-react';
import { useSquareCatalog } from '@kit/hooks';
import { formatDateTime } from '@kit/lib/date-format';
import { processCatalogData } from '../../../process-catalog';

function formatMoney(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format((amount ?? 0) / 100);
}

export default function SquareCatalogDetailPage({
  params,
}: {
  params: Promise<{ id: string; objectId: string }>;
}) {
  const router = useRouter();
  const [resolved, setResolved] = useState<{ id: string; objectId: string } | null>(null);

  useEffect(() => {
    params.then(setResolved);
  }, [params]);

  const catalogParams = { types: ['ITEM', 'ITEM_VARIATION', 'CATEGORY', 'MODIFIER', 'MODIFIER_LIST', 'TAX'] as const };
  const { data: catalog, isLoading, error } = useSquareCatalog(
    resolved?.id ?? '',
    catalogParams,
    { enabled: !!resolved?.id }
  );

  const processed = processCatalogData(catalog);
  const item = resolved?.objectId
    ? processed.find((i: any) => i.id === resolved.objectId)
    : null;

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
                Failed to load catalog: {(error as Error).message}
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && item && (
          <CatalogItemDetail item={item} />
        )}

        {!isLoading && !error && !item && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Catalog item not found.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function CatalogItemDetail({ item }: { item: any }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{item.name}</h1>
            <p className="text-sm text-muted-foreground font-mono">{item.id}</p>
          </div>
        </div>
        <Badge variant={item.is_deleted ? 'secondary' : 'default'}>
          {item.is_deleted ? 'Deleted' : 'Active'}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item ID</span>
              <span className="font-mono text-xs break-all">{item.id}</span>
            </div>
            {item.categoryName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <Badge variant="outline">{item.categoryName}</Badge>
              </div>
            )}
            {item.updated_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{formatDateTime(item.updated_at)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {item.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {(item.variations?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Variations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {item.variations.map((v: any, idx: number) => {
                const price = v.item_variation_data?.price_money;
                const name = v.item_variation_data?.name ?? 'Unnamed';
                const sku = v.item_variation_data?.sku;
                return (
                  <div
                    key={v.id ?? idx}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 border-b last:border-0"
                  >
                    <div>
                      <span className="font-medium">{name}</span>
                      {sku && (
                        <span className="ml-2 text-xs text-muted-foreground">SKU: {sku}</span>
                      )}
                    </div>
                    {price && (
                      <span>{formatMoney(price.amount, price.currency)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {(item.modifierLists?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modifier lists</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {item.modifierLists.map((modListInfo: any, idx: number) => {
              const modList = modListInfo.modifierList;
              const modifiers = modListInfo.modifiers || [];
              const listName = modList?.modifier_list_data?.name ?? 'Unnamed list';
              return (
                <div key={modListInfo.modifier_list_id ?? idx} className="border-l-2 border-muted pl-3">
                  <p className="font-medium text-sm">{listName}</p>
                  {modifiers.length > 0 ? (
                    <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                      {modifiers.map((mod: any, mi: number) => {
                        const modPrice = mod.modifier_data?.price_money;
                        return (
                          <li key={mod.id ?? mi}>
                            • {mod.modifier_data?.name ?? 'Unnamed'}
                            {modPrice && (
                              <span className="ml-1">
                                (+{formatMoney(modPrice.amount, modPrice.currency)})
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">No modifiers</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {(item.taxes?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Taxes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {item.taxes.map((t: any, i: number) => (
                <Badge key={t.id ?? i} variant="outline">
                  {t.tax_data?.name ?? 'Tax'}
                  {t.tax_data?.percentage != null && ` (${t.tax_data.percentage}%)`}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
