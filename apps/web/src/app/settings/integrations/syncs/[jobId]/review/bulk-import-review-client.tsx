"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Textarea } from "@kit/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kit/ui/table";
import { Badge } from "@kit/ui/badge";
import { Alert, AlertDescription } from "@kit/ui/alert";
import { ArrowLeft, ClipboardList, Loader2 } from "lucide-react";
import {
  useBulkImportPreview,
  useBulkApplySyncJob,
  usePutBulkImportReview,
  useToast,
} from "@kit/hooks";
import { BULK_IMPORT_ENTITY_LABELS } from "@/lib/bulk-import/constants";
import { mergeSuggestedReviewPayload } from "@/lib/bulk-import/bulk-import-resolution-hints";
import type { BulkImportResolutionHints } from "@kit/types";

function entityLabel(entity: string): string {
  return (BULK_IMPORT_ENTITY_LABELS as Record<string, string>)[entity] ?? entity;
}

function suggestedPayloadHasMaps(h: BulkImportResolutionHints["suggested_payload"] | undefined): boolean {
  if (!h) return false;
  const maps = [
    h.categoryNameToId,
    h.unitLabelToId,
    h.supplierNameToId,
    h.skuToItemId,
    h.itemNameToId,
    h.bySourceId,
  ];
  return maps.some((m) => m && typeof m === "object" && Object.keys(m).length > 0);
}

function countUnresolved(u: BulkImportResolutionHints["unresolved"]): number {
  return (
    u.categoryNames.length +
    u.unitLabels.length +
    u.supplierNames.length +
    u.skus.length +
    u.itemNames.length
  );
}

export function BulkImportReviewClient() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId != null ? Number(params.jobId) : null;
  const { toast } = useToast();

  const { data: preview, isLoading, error, refetch } = useBulkImportPreview(jobId, {
    limit: 200,
    offset: 0,
  });
  const putReview = usePutBulkImportReview();
  const applyJob = useBulkApplySyncJob();

  const [draftJson, setDraftJson] = useState("");

  const job = preview?.job;
  const entity = preview?.entity ?? "";

  useEffect(() => {
    if (!job) return;
    try {
      const raw = job.bulk_review_payload;
      if (raw != null && typeof raw === "object" && Object.keys(raw as object).length > 0) {
        setDraftJson(JSON.stringify(raw, null, 2));
      } else {
        setDraftJson("{}");
      }
    } catch {
      setDraftJson("{}");
    }
  }, [job?.bulk_review_payload, job?.id, job]);

  const parsedPayload = useMemo(() => {
    try {
      const p = JSON.parse(draftJson || "{}");
      return { ok: true as const, value: typeof p === "object" && p !== null ? (p as Record<string, unknown>) : {} };
    } catch {
      return { ok: false as const, value: {} };
    }
  }, [draftJson]);

  const canEdit =
    job &&
    (job.bulk_review_status === "needs_review" || job.bulk_review_status === "ready") &&
    job.status !== "processing" &&
    job.status !== "completed";

  const handleSaveDraft = async () => {
    if (jobId == null || !parsedPayload.ok) {
      toast({
        title: "Invalid JSON",
        description: "Fix the review JSON before saving.",
        variant: "destructive",
      });
      return;
    }
    try {
      await putReview.mutateAsync({ jobId, bulk_review_payload: parsedPayload.value });
      toast({ title: "Saved", description: "Review draft updated." });
      refetch();
    } catch (e: unknown) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Failed",
        variant: "destructive",
      });
    }
  };

  const hints = preview?.resolution_hints ?? null;
  const handleMergeSuggestions = () => {
    if (!hints || !parsedPayload.ok) return;
    if (!suggestedPayloadHasMaps(hints.suggested_payload)) {
      toast({
        title: "Nothing to merge",
        description: "No catalog matches were found for this file.",
        variant: "destructive",
      });
      return;
    }
    const merged = mergeSuggestedReviewPayload(parsedPayload.value, hints.suggested_payload);
    setDraftJson(JSON.stringify(merged, null, 2));
    toast({
      title: "Merged",
      description: "Suggested IDs were merged into the draft. Save or apply when ready.",
    });
  };

  const handleApply = async () => {
    if (jobId == null || !parsedPayload.ok) {
      toast({
        title: "Invalid JSON",
        description: "Fix the review JSON before applying.",
        variant: "destructive",
      });
      return;
    }
    try {
      await applyJob.mutateAsync({ jobId, bulk_review_payload: parsedPayload.value });
      toast({ title: "Queued", description: "Import will run in the background." });
      router.push(`/settings/integrations/syncs/${jobId}`);
    } catch (e: unknown) {
      toast({
        title: "Apply failed",
        description: e instanceof Error ? e.message : "Failed",
        variant: "destructive",
      });
    }
  };

  if (jobId == null || (params?.jobId != null && isNaN(Number(params.jobId)))) {
    return (
      <AppLayout>
        <div className="p-6">
          <p className="text-muted-foreground">Invalid job ID</p>
        </div>
      </AppLayout>
    );
  }

  if (isLoading && !preview) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (error || !preview) {
    return (
      <AppLayout>
        <div className="space-y-4 p-4 md:p-6 max-w-3xl">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings/integrations/syncs">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Sync activity
            </Link>
          </Button>
          <Alert variant="destructive">
            <AlertDescription>
              {(error as Error)?.message ?? "Could not load bulk import preview."}
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  if (job?.bulk_review_status === "complete" || job?.status === "completed") {
    return (
      <AppLayout>
        <div className="space-y-4 p-4 md:p-6 max-w-3xl">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/settings/integrations/syncs/${jobId}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to job
            </Link>
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Import finished</CardTitle>
              <CardDescription>This bulk job has already been applied.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const tpl = preview.template_columns ?? [];

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
              <Link href={`/settings/integrations/syncs/${jobId}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Job #{jobId}
              </Link>
            </Button>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                <ClipboardList className="h-7 w-7 text-muted-foreground" />
                Review bulk import
              </h1>
              <Badge variant="secondary">{entityLabel(entity)}</Badge>
              <Badge variant="outline">{job?.bulk_review_status ?? "—"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {preview.rows_staged} row{preview.rows_staged === 1 ? "" : "s"} staged. Preview shows up to{" "}
              {preview.pagination.limit} rows.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={!canEdit || putReview.isPending || !parsedPayload.ok}
            >
              {putReview.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save draft
            </Button>
            <Button onClick={handleApply} disabled={!canEdit || applyJob.isPending || !parsedPayload.ok}>
              {applyJob.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Apply import
            </Button>
          </div>
        </div>

        {!parsedPayload.ok && (
          <Alert variant="destructive">
            <AlertDescription>Review JSON is not valid — fix syntax to save or apply.</AlertDescription>
          </Alert>
        )}

        {hints && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Catalog matches</CardTitle>
              <CardDescription>
                Names and SKUs in your file matched against categories, unit variables, suppliers, and items (up to
                8000 staged rows scanned).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleMergeSuggestions}
                  disabled={!canEdit || !suggestedPayloadHasMaps(hints.suggested_payload)}
                >
                  Merge suggestions into draft
                </Button>
                {countUnresolved(hints.unresolved) > 0 && (
                  <span className="text-sm text-amber-600 dark:text-amber-500">
                    {countUnresolved(hints.unresolved)} value(s) not found in catalog
                  </span>
                )}
              </div>
              {suggestedPayloadHasMaps(hints.suggested_payload) && (
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-52 whitespace-pre-wrap">
                  {JSON.stringify(hints.suggested_payload, null, 2)}
                </pre>
              )}
              {countUnresolved(hints.unresolved) > 0 && (
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p className="font-medium text-foreground">Unresolved — fix spelling or set IDs in JSON</p>
                  <ul className="list-disc list-inside space-y-1">
                    {hints.unresolved.categoryNames.length > 0 && (
                      <li>Categories: {hints.unresolved.categoryNames.join(", ")}</li>
                    )}
                    {hints.unresolved.unitLabels.length > 0 && (
                      <li>Units: {hints.unresolved.unitLabels.join(", ")}</li>
                    )}
                    {hints.unresolved.supplierNames.length > 0 && (
                      <li>Suppliers: {hints.unresolved.supplierNames.join(", ")}</li>
                    )}
                    {hints.unresolved.skus.length > 0 && (
                      <li>SKUs: {hints.unresolved.skus.join(", ")}</li>
                    )}
                    {hints.unresolved.itemNames.length > 0 && (
                      <li>Item names: {hints.unresolved.itemNames.join(", ")}</li>
                    )}
                  </ul>
                </div>
              )}
              {Object.keys(hints.ambiguous_item_names).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Ambiguous item names</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Search name</TableHead>
                        <TableHead>Matches (id / sku / name)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(hints.ambiguous_item_names).map(([name, candidates]) => (
                        <TableRow key={name}>
                          <TableCell className="font-mono text-xs align-top">{name}</TableCell>
                          <TableCell className="text-xs">
                            {(candidates ?? [])
                              .map((c) => `#${c.id} ${c.sku ? `${c.sku} · ` : ""}${c.name}`)
                              .join(" · ")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Column reference</CardTitle>
            <CardDescription>Expected fields for this entity (from your template).</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Column</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tpl.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      No template metadata for this entity type.
                    </TableCell>
                  </TableRow>
                ) : (
                  tpl.map((c) => (
                    <TableRow key={c.key}>
                      <TableCell className="font-mono text-xs">{c.key}</TableCell>
                      <TableCell>{c.required ? "yes" : "no"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.description}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Review payload (JSON)</CardTitle>
            <CardDescription>
              Optional JSON applied before each row is imported:{' '}
              <span className="font-mono text-xs">
                bySourceId, categoryNameToId, unitLabelToId, supplierNameToId, skuToItemId, itemNameToId
              </span>
              . Staged rows can use semantic names (e.g. categoryName + maps) where the parser provides them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              className="font-mono text-xs min-h-[140px]"
              value={draftJson}
              onChange={(e) => setDraftJson(e.target.value)}
              disabled={!canEdit}
              spellCheck={false}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Row preview</CardTitle>
            <CardDescription>Staged rows (truncated payload in cell).</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">source_id</TableHead>
                  <TableHead className="w-[100px]">data_type</TableHead>
                  <TableHead>payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.map((r) => (
                  <TableRow key={`${r.source_id}-${r.data_type}`}>
                    <TableCell className="font-mono text-xs align-top">{r.source_id}</TableCell>
                    <TableCell className="text-xs align-top">{r.data_type}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[520px] truncate align-top">
                      {typeof r.payload === "object"
                        ? JSON.stringify(r.payload)
                        : String(r.payload ?? "")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
