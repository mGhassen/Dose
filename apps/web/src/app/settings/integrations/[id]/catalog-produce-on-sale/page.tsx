"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAuthToken } from "@kit/lib/api";
import { useIntegrationById, useSyncIntegration } from "@kit/hooks";
import { useToast } from "@kit/hooks";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Button } from "@kit/ui/button";
import { Switch } from "@kit/ui/switch";
import { Label } from "@kit/ui/label";
import { Loader2, ArrowLeft, Package } from "lucide-react";
import type { SquareCatalogItemRow } from "@/app/api/integrations/[id]/square-catalog-items/route";
import { SyncPeriodDialog, type SyncPeriodSelection } from "../sync-period-dialog";

export default function CatalogProduceOnSalePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const syncType = (searchParams.get("sync") as "catalog" | "full" | null) ?? "catalog";
  const { toast } = useToast();
  const syncIntegration = useSyncIntegration();
  const { data: integration, isSuccess: integrationLoaded } = useIntegrationById(id);

  const [rows, setRows] = useState<SquareCatalogItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [pendingPeriod, setPendingPeriod] = useState<SyncPeriodSelection | null>(null);
  const didAutoOpenPeriod = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/integrations/${id}/square-catalog-items`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRows(data.items ?? []);
    } catch (e: unknown) {
      toast({
        title: "Could not load catalog items",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (syncType !== "full" || !integrationLoaded || didAutoOpenPeriod.current) return;
    didAutoOpenPeriod.current = true;
    setPeriodOpen(true);
  }, [syncType, integrationLoaded]);

  const setProduce = (itemId: number, produceOnSale: boolean) => {
    setRows((prev) => prev.map((r) => (r.itemId === itemId ? { ...r, produceOnSale } : r)));
  };

  const setAll = (produceOnSale: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, produceOnSale })));
  };

  const saveProduceSettings = async () => {
    const token = getAuthToken();
    const updates = rows.map((r) => ({ itemId: r.itemId, produceOnSale: r.produceOnSale }));
    if (updates.length === 0) return;
    const patchRes = await fetch(`/api/integrations/${id}/square-catalog-items`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ updates }),
    });
    if (!patchRes.ok) throw new Error(await patchRes.text());
  };

  const runSyncAfterSave = async (period?: SyncPeriodSelection) => {
    if (!id) return;
    setSaving(true);
    try {
      await saveProduceSettings();

      const res = await syncIntegration.mutateAsync({
        id,
        syncType: syncType === "full" ? "full" : "catalog",
        ...(syncType === "full" && period ? { period } : {}),
      });
      const jobId = res && typeof res === "object" && "job_id" in res ? (res as { job_id?: number }).job_id : undefined;
      if (jobId != null && Number.isFinite(jobId)) {
        setSaving(false);
        router.replace(`/settings/integrations/syncs/${jobId}`);
        return;
      }
      toast({ title: "Sync started", description: "No job id returned — check integrations for status." });
      router.push(`/settings/integrations/${id}`);
    } catch (e: unknown) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onClickStart = () => {
    if (syncType === "full" && !pendingPeriod) {
      setPeriodOpen(true);
      return;
    }
    void runSyncAfterSave(syncType === "full" ? pendingPeriod ?? undefined : undefined);
  };

  const periodSummary =
    pendingPeriod?.mode === "last_sync"
      ? "Since last sync"
      : pendingPeriod?.mode === "custom"
        ? "Custom date range"
        : pendingPeriod?.mode === "all"
          ? "All from start"
          : null;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/settings/integrations/${id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              <div>
                <CardTitle>Produced on sale (Square catalog)</CardTitle>
                <CardDescription>
                  For each catalog SKU, choose whether the sellable product is produced when sold. When on, we link a
                  production recipe to the item (creating one if needed) so sales run through recipe production—add
                  ingredients to that recipe in the kitchen flow. Defaults are on; you can set all below.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {syncType === "full" && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Full sync pulls orders and payments for the <strong>data period</strong> you choose (catalog and
                  locations are refreshed regardless). Pick produced-on-sale defaults below, then{' '}
                  <strong>Save &amp; start sync</strong>.
                </p>
                {pendingPeriod ? (
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>
                      Period: <span className="text-foreground font-medium">{periodSummary}</span>
                    </span>
                    <button
                      type="button"
                      className="text-primary underline underline-offset-2 text-sm font-normal"
                      onClick={() => setPeriodOpen(true)}
                    >
                      Change
                    </button>
                  </p>
                ) : (
                  <p className="text-amber-700 dark:text-amber-500">
                    Choose the sync period in the dialog (it opens automatically), or click Save &amp; start sync to open
                    it.
                  </p>
                )}
              </div>
            )}
            {syncType === "catalog" && (
              <p className="text-sm text-muted-foreground">
                After saving, a <strong>catalog</strong> sync will run.
              </p>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="outline" size="sm" onClick={() => setAll(true)} disabled={loading || rows.length === 0}>
                Set all: produced on sale
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setAll(false)} disabled={loading || rows.length === 0}>
                Set all: off
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading catalog items…
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No Square catalog items mapped yet. You can continue to sync — new catalog SKUs will default to
                &quot;produced on sale&quot; when they are created.
              </p>
            ) : (
              <ul className="divide-y rounded-md border">
                {rows.map((r) => (
                  <li key={r.itemId} className="flex items-center justify-between gap-4 p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.name}</div>
                      <div className="text-xs text-muted-foreground">Item #{r.itemId}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label htmlFor={`pos-${r.itemId}`} className="text-sm whitespace-nowrap">
                        Produced on sale
                      </Label>
                      <Switch
                        id={`pos-${r.itemId}`}
                        checked={r.produceOnSale}
                        onCheckedChange={(c) => setProduce(r.itemId, !!c)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" asChild>
                <Link href={`/settings/integrations/${id}`}>Cancel</Link>
              </Button>
              <Button type="button" onClick={onClickStart} disabled={saving || syncIntegration.isPending}>
                {(saving || syncIntegration.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save &amp; start sync
              </Button>
            </div>
          </CardContent>
        </Card>

        {syncType === "full" && (
          <SyncPeriodDialog
            open={periodOpen}
            onOpenChange={setPeriodOpen}
            lastSyncAt={integration?.last_sync_at}
            isPending={false}
            confirmLabel="Continue"
            onConfirm={async (selection) => {
              setPendingPeriod(selection);
              setPeriodOpen(false);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
