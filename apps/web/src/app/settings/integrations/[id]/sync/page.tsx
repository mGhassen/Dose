"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthToken } from "@kit/lib/api";
import { useIntegrationById, useIntegrations, useSyncIntegration, useLatestSyncJob } from "@kit/hooks";
import { useToast } from "@kit/hooks";
import AppLayout from "@/components/app-layout";
import { Alert, AlertDescription } from "@kit/ui/alert";
import { Button } from "@kit/ui/button";
import { Checkbox } from "@kit/ui/checkbox";
import { Label } from "@kit/ui/label";
import { Switch } from "@kit/ui/switch";
import { RadioGroup, RadioGroupItem } from "@kit/ui/radio-group";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import type { SyncJob } from "@kit/types";
import type { SquareCatalogItemRow } from "@/app/api/integrations/[id]/square-catalog-items/route";
import {
  isSyncPeriodValid,
  type SyncPeriodSelection,
} from "../sync-period-form";
import { formatSyncPeriodSummary } from "../sync-period-dialog";
import { SyncWizardStepper } from "../sync-wizard-stepper";
import { countMonthsInSyncPeriod } from "@/lib/sync-period-utils";
import {
  allScope,
  emptyScope,
  hasScopeSelection,
  isSyncAllScope,
  resolveSyncJobs,
  scopeNeedsCatalogStep,
  scopeNeedsPeriod,
  type SyncScope,
  type SquareSyncType,
} from "../square-sync-utils";
import { isSquareSyncBlocked } from "../square-sync-status";

const SyncPeriodForm = dynamic(
  () => import("../sync-period-form").then((m) => m.SyncPeriodForm),
  {
    loading: () => (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading period options…
      </div>
    ),
    ssr: false,
  }
);

const SCOPE_OPTIONS: {
  key: keyof SyncScope;
  label: string;
  description: string;
  icon: typeof Package;
}[] = [
  { key: "catalog", label: "Catalog", description: "Items, categories, modifiers, taxes", icon: Package },
  { key: "orders", label: "Orders", description: "Sales and line items", icon: ShoppingCart },
  { key: "payments", label: "Payments", description: "Payment transactions", icon: CreditCard },
  { key: "locations", label: "Locations", description: "Square business locations", icon: MapPin },
];

function buildSteps(
  scope: SyncScope,
  monthCount: number,
  includeCatalogStep: boolean
): { id: string; label: string }[] {
  const steps = [{ id: "scope", label: "What to sync" }];
  if (scopeNeedsPeriod(scope)) {
    steps.push({ id: "period", label: "Period" });
    if (monthCount > 1) steps.push({ id: "split", label: "Split jobs" });
  }
  if (includeCatalogStep) {
    steps.push({ id: "catalog", label: "Catalog defaults" });
  }
  steps.push({ id: "review", label: "Start" });
  return steps;
}

export default function SquareSyncPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const { toast } = useToast();
  const { data: integrations = [] } = useIntegrations();
  const { data: integrationById } = useIntegrationById(id);
  const integration = useMemo(
    () => integrationById ?? integrations.find((i) => String(i.id) === id) ?? null,
    [integrationById, integrations, id]
  );
  const { data: latestJob } = useLatestSyncJob(id);
  const syncIntegration = useSyncIntegration();

  const syncBlocked = isSquareSyncBlocked((latestJob as SyncJob | null) ?? null);

  const [step, setStep] = useState(0);
  const [scope, setScope] = useState<SyncScope>(emptyScope);
  const [period, setPeriod] = useState<SyncPeriodSelection | null>(null);
  const [fragmentByMonth, setFragmentByMonth] = useState(true);
  const [catalogRows, setCatalogRows] = useState<SquareCatalogItemRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoadError, setCatalogLoadError] = useState<string | null>(null);
  const [catalogFetched, setCatalogFetched] = useState(false);
  const [starting, setStarting] = useState(false);

  const monthCount = useMemo(() => {
    if (!period || !integration || !isSyncPeriodValid(period)) return 0;
    return countMonthsInSyncPeriod(integration, {
      mode: period.mode,
      startAt: period.startAt,
      endAt: period.endAt,
    });
  }, [period, integration]);

  const includeCatalogStep =
    scopeNeedsCatalogStep(scope) && !catalogLoading && catalogRows.length > 0;

  const steps = useMemo(
    () => buildSteps(scope, monthCount, includeCatalogStep),
    [scope, monthCount, includeCatalogStep]
  );
  const currentStepId = steps[step]?.id ?? "scope";
  const jobs = useMemo(() => resolveSyncJobs(scope), [scope]);

  useEffect(() => {
    if (step >= steps.length) {
      setStep(Math.max(0, steps.length - 1));
    }
  }, [steps.length, step]);

  useEffect(() => {
    if (currentStepId === "period" && !period && integration) {
      setPeriod(integration.last_sync_at ? { mode: "last_sync" } : { mode: "all" });
    }
  }, [currentStepId, period, integration]);

  const loadCatalog = useCallback(async () => {
    if (!id || catalogFetched) return;
    setCatalogLoading(true);
    setCatalogLoadError(null);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/integrations/${id}/square-catalog-items`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCatalogRows(data.items ?? []);
      setCatalogFetched(true);
    } catch (e: unknown) {
      setCatalogRows([]);
      setCatalogLoadError(e instanceof Error ? e.message : "Failed to load catalog settings");
      setCatalogFetched(true);
    } finally {
      setCatalogLoading(false);
    }
  }, [id, catalogFetched]);

  useEffect(() => {
    if (!scope.catalog || step === 0) return;
    void loadCatalog();
  }, [scope.catalog, step, loadCatalog]);

  const toggleScope = (key: keyof SyncScope, checked: boolean) => {
    setScope((prev) => ({ ...prev, [key]: checked }));
  };

  const selectSyncAll = () => {
    setScope(allScope());
  };

  const setProduce = (itemId: number, produceOnSale: boolean) => {
    setCatalogRows((prev) => prev.map((r) => (r.itemId === itemId ? { ...r, produceOnSale } : r)));
  };

  const saveCatalogSettings = async () => {
    if (catalogRows.length === 0) return;
    const token = getAuthToken();
    const updates = catalogRows.map((r) => ({ itemId: r.itemId, produceOnSale: r.produceOnSale }));
    const res = await fetch(`/api/integrations/${id}/square-catalog-items`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ updates }),
    });
    if (!res.ok) throw new Error(await res.text());
  };

  const canAdvance = (): boolean => {
    switch (currentStepId) {
      case "scope":
        return hasScopeSelection(scope);
      case "period":
        return integration != null && period != null && isSyncPeriodValid(period);
      case "split":
        return true;
      case "catalog":
        return !catalogLoading;
      case "review":
        return !syncBlocked;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canAdvance()) return;
    if (step < steps.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else router.push(`/settings/integrations/${id}`);
  };

  const startSync = async (
    syncType: SquareSyncType,
    periodPayload?: { mode: "last_sync" | "custom" | "all"; startAt?: string; endAt?: string },
    split?: boolean
  ): Promise<number | null> => {
    const res = await syncIntegration.mutateAsync({
      id,
      syncType,
      period: periodPayload,
      fragmentByMonth: split,
    });
    if (res && "status" in res && res.status === "failed") {
      throw new Error(res.error_message ?? "Sync failed");
    }
    return res?.job_id ?? null;
  };

  const handleStart = async () => {
    if (!hasScopeSelection(scope) || syncBlocked || !integration) return;
    setStarting(true);
    try {
      if (scopeNeedsCatalogStep(scope) && catalogRows.length > 0) {
        await saveCatalogSettings();
      }

      const periodPayload =
        scopeNeedsPeriod(scope) && period && isSyncPeriodValid(period)
          ? { mode: period.mode, startAt: period.startAt, endAt: period.endAt }
          : undefined;
      const split = scopeNeedsPeriod(scope) && monthCount > 1 && fragmentByMonth;

      let firstJobId: number | null = null;
      for (const jobType of jobs) {
        const isFull = jobType === "full";
        const jobId = await startSync(jobType, isFull ? periodPayload : undefined, isFull ? split : undefined);
        if (jobId != null && firstJobId == null) firstJobId = jobId;
      }

      if (firstJobId != null) {
        toast({
          title: "Sync started",
          description: jobs.length > 1 ? `${jobs.length} jobs queued` : `Job #${firstJobId}`,
        });
        window.location.href = `/settings/integrations/syncs/${firstJobId}`;
      }
    } catch (e: unknown) {
      toast({
        title: "Sync failed",
        description: e instanceof Error ? e.message : "Failed to start sync",
        variant: "destructive",
      });
    } finally {
      setStarting(false);
    }
  };

  const isLastStep = step === steps.length - 1;
  const integrationReady = integration != null;

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4 pb-12 md:px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 0 ? "Back to integration" : "Back"}
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sync Square data</h1>
        </div>

        {syncBlocked && latestJob && (
          <Alert className="border-blue-500/40 bg-blue-500/5">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Sync job #{latestJob.id} is already running. Wait for it to finish before starting a new one.
              </span>
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link href={`/settings/integrations/syncs/${latestJob.id}`}>Open job</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <SyncWizardStepper steps={steps} currentStep={step} onStepClick={(i) => i < step && setStep(i)} />

        {currentStepId === "scope" && (
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => {
                selectSyncAll();
                setStep(1);
              }}
              disabled={syncBlocked}
              className="w-full text-left rounded-xl border-2 border-primary bg-primary/5 p-6 transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary p-3 text-primary-foreground shrink-0">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-semibold">Sync all</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Catalog, orders, payments, and locations — recommended for most setups.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-primary shrink-0 mt-1" />
              </div>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground">or choose specific data</span>
              </div>
            </div>

            <div className="space-y-2">
              {SCOPE_OPTIONS.map(({ key, label, description, icon: Icon }) => (
                <label
                  key={key}
                  htmlFor={`sync-scope-${key}`}
                  className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/40 has-[[data-state=checked]]:border-primary/60 has-[[data-state=checked]]:bg-primary/5"
                >
                  <Checkbox
                    id={`sync-scope-${key}`}
                    checked={scope[key]}
                    onCheckedChange={(v) => toggleScope(key, v === true)}
                    disabled={syncBlocked}
                  />
                  <div className="flex flex-1 items-start gap-3">
                    <Icon className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-sm font-medium">{label}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {currentStepId === "period" && (
          integrationReady ? (
            <SyncPeriodForm
              lastSyncAt={integration.last_sync_at}
              value={period}
              onChange={setPeriod}
              hideIntro
            />
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading integration…
            </div>
          )
        )}

        {currentStepId === "split" && (
          <RadioGroup
            value={fragmentByMonth ? "split" : "single"}
            onValueChange={(v) => setFragmentByMonth(v === "split")}
            className="gap-3"
          >
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <RadioGroupItem value="split" id="frag-split" className="mt-1" />
              <div>
                <Label htmlFor="frag-split" className="font-medium">
                  Split into {monthCount} monthly jobs (recommended)
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  1 catalog job + {monthCount} data jobs — easier to recover if one month fails.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <RadioGroupItem value="single" id="frag-single" className="mt-1" />
              <div>
                <Label htmlFor="frag-single" className="font-medium">
                  Single job for all {monthCount} months
                </Label>
              </div>
            </div>
          </RadioGroup>
        )}

        {currentStepId === "catalog" && (
          <div>
            {catalogLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading settings…
              </div>
            ) : catalogLoadError ? (
              <p className="text-sm text-destructive py-4">{catalogLoadError}</p>
            ) : catalogRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No mapped items yet — new SKUs default to produced on sale during sync.
              </p>
            ) : (
              <ul className="divide-y rounded-md border max-h-[360px] overflow-y-auto">
                {catalogRows.map((r) => (
                  <li key={r.itemId} className="flex items-center justify-between gap-4 p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate text-sm">{r.name}</div>
                      <div className="text-xs text-muted-foreground">Item #{r.itemId}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label htmlFor={`pos-${r.itemId}`} className="text-xs whitespace-nowrap">
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
          </div>
        )}

        {currentStepId === "review" && (
          <dl className="rounded-lg border divide-y text-sm">
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted-foreground shrink-0">Data</dt>
              <dd className="text-right font-medium">
                {isSyncAllScope(scope)
                  ? "All"
                  : SCOPE_OPTIONS.filter(({ key }) => scope[key])
                      .map(({ label }) => label)
                      .join(", ")}
              </dd>
            </div>
            {scopeNeedsPeriod(scope) && period && (
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-muted-foreground shrink-0">Period</dt>
                <dd className="text-right font-medium">{formatSyncPeriodSummary(period)}</dd>
              </div>
            )}
            {scopeNeedsPeriod(scope) && monthCount > 1 && (
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-muted-foreground shrink-0">Jobs</dt>
                <dd className="text-right font-medium">
                  {fragmentByMonth ? `${monthCount + 1} (catalog + monthly)` : "1 combined job"}
                </dd>
              </div>
            )}
            {!scopeNeedsPeriod(scope) && (
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-muted-foreground shrink-0">Jobs</dt>
                <dd className="text-right font-medium">
                  {jobs.length} queued
                </dd>
              </div>
            )}
            {scopeNeedsCatalogStep(scope) && catalogRows.length === 0 && (
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-muted-foreground shrink-0">Catalog</dt>
                <dd className="text-right font-medium text-muted-foreground">
                  New Square SKUs will default to produced on sale
                </dd>
              </div>
            )}
          </dl>
        )}

        <div className="flex justify-between gap-3 pt-2">
          <Button variant="outline" onClick={handleBack} disabled={starting}>
            {step === 0 ? "Cancel" : "Previous"}
          </Button>
          {!isLastStep ? (
            <Button onClick={handleNext} disabled={!canAdvance()}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => void handleStart()}
              disabled={starting || syncBlocked || !integrationReady}
            >
              {starting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Start sync
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
