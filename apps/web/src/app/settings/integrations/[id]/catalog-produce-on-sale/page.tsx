"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@kit/ui/radio-group";
import { Loader2, ArrowLeft, Package } from "lucide-react";
import type { SquareCatalogItemRow } from "@/app/api/integrations/[id]/square-catalog-items/route";
import {
  SyncPeriodForm,
  isSyncPeriodValid,
  type SyncPeriodSelection,
} from "../sync-period-form";
import { formatSyncPeriodSummary } from "../sync-period-dialog";
import { SyncWizardStepper } from "../sync-wizard-stepper";
import {
  countMonthsInSyncPeriod,
  getMonthlyRangesForSyncPeriod,
} from "@/lib/sync-period-utils";

const FULL_SYNC_STEPS = [
  { id: "period", label: "Period" },
  { id: "split", label: "Split jobs" },
  { id: "catalog", label: "Catalog" },
];

export default function CatalogProduceOnSalePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const syncType = (searchParams.get("sync") as "catalog" | "full" | null) ?? "catalog";
  const { toast } = useToast();
  const syncIntegration = useSyncIntegration();
  const { data: integration } = useIntegrationById(id);

  const [rows, setRows] = useState<SquareCatalogItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [period, setPeriod] = useState<SyncPeriodSelection | null>(null);
  const [fragmentByMonth, setFragmentByMonth] = useState(true);

  useEffect(() => {
    if (syncType !== "full" || period || !integration) return;
    setPeriod(integration.last_sync_at ? { mode: "last_sync" } : { mode: "all" });
  }, [syncType, period, integration]);

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

  const monthCount = useMemo(() => {
    if (!period || !integration) return 0;
    const fullPeriod = {
      mode: period.mode,
      startAt: period.startAt,
      endAt: period.endAt,
    };
    return countMonthsInSyncPeriod(integration, fullPeriod);
  }, [period, integration]);

  const monthPreview = useMemo(() => {
    if (!period || !integration || monthCount <= 1) return [];
    const fullPeriod = {
      mode: period.mode,
      startAt: period.startAt,
      endAt: period.endAt,
    };
    return getMonthlyRangesForSyncPeriod(integration, fullPeriod).map((r) => r.monthLabel);
  }, [period, integration, monthCount]);

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

  const handleNext = () => {
    if (step === 0) {
      if (monthCount > 1) {
        setStep(1);
      } else {
        setStep(2);
      }
      return;
    }
    if (step === 1) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2 && monthCount <= 1) {
      setStep(0);
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };

  const runSyncAfterSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await saveProduceSettings();

      const res = await syncIntegration.mutateAsync({
        id,
        syncType: syncType === "full" ? "full" : "catalog",
        ...(syncType === "full" && period
          ? { period, fragmentByMonth: monthCount > 1 && fragmentByMonth }
          : {}),
      });
      toast({
        title: "Sync started",
        description:
          "status" in res && res.status === "failed"
            ? res.error_message ?? "Sync failed"
            : (res as { message?: string }).message ?? "Jobs are running in the background.",
      });
      router.replace(`/settings/integrations/syncs?integration_id=${id}`);
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

  const catalogList = (
    <>
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
    </>
  );

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
                <CardTitle>
                  {syncType === "full" ? "Sync All Data" : "Produced on sale (Square catalog)"}
                </CardTitle>
                <CardDescription>
                  {syncType === "full"
                    ? "Configure the sync period, optional monthly split, and catalog defaults before starting."
                    : "For each catalog SKU, choose whether the sellable product is produced when sold. When on, we link a production recipe to the item (creating one if needed) so sales run through recipe production—add ingredients to that recipe in the kitchen flow. Defaults are on; you can set all below."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {syncType === "full" && (
              <>
                <SyncWizardStepper
                  steps={FULL_SYNC_STEPS}
                  currentStep={step}
                  onStepClick={(i) => setStep(i)}
                />

                {step === 0 && (
                  <SyncPeriodForm
                    lastSyncAt={integration?.last_sync_at}
                    value={period}
                    onChange={setPeriod}
                  />
                )}

                {step === 1 && monthCount > 1 && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Your period spans <strong>{monthCount} months</strong>. Splitting creates one
                      orders/payments job per month plus a separate catalog job — easier to recover if
                      one month fails.
                    </p>
                    <RadioGroup
                      value={fragmentByMonth ? "split" : "single"}
                      onValueChange={(v) => setFragmentByMonth(v === "split")}
                      className="gap-3"
                    >
                      <div className="flex items-start gap-3 rounded-md border p-3">
                        <RadioGroupItem value="split" id="frag-split" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="frag-split" className="font-medium">
                            Split by month (recommended)
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            1 catalog job + {monthCount} monthly data jobs
                          </p>
                          <p className="text-xs text-muted-foreground mt-2 font-mono">
                            {monthPreview.join(", ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-md border p-3">
                        <RadioGroupItem value="single" id="frag-single" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="frag-single" className="font-medium">
                            Single job
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            One full sync job for the entire period
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Period: <span className="text-foreground font-medium">{period ? formatSyncPeriodSummary(period) : "—"}</span>
                      {monthCount > 1 && (
                        <>
                          {" · "}
                          {fragmentByMonth ? `Split into ${monthCount} monthly jobs` : "Single job"}
                        </>
                      )}
                    </p>
                    {catalogList}
                  </div>
                )}

                <div className="flex justify-between gap-2 pt-4">
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/settings/integrations/${id}`}>Cancel</Link>
                  </Button>
                  <div className="flex gap-2">
                    {step > 0 && (
                      <Button type="button" variant="outline" onClick={handleBack}>
                        Back
                      </Button>
                    )}
                    {step < 2 ? (
                      <Button
                        type="button"
                        onClick={handleNext}
                        disabled={step === 0 && !isSyncPeriodValid(period)}
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => void runSyncAfterSave()}
                        disabled={saving || syncIntegration.isPending || !period}
                      >
                        {(saving || syncIntegration.isPending) && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Start sync
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}

            {syncType === "catalog" && (
              <>
                <p className="text-sm text-muted-foreground">
                  After saving, a <strong>catalog</strong> sync will run.
                </p>
                {catalogList}
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/settings/integrations/${id}`}>Cancel</Link>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void runSyncAfterSave()}
                    disabled={saving || syncIntegration.isPending}
                  >
                    {(saving || syncIntegration.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Save &amp; start sync
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
