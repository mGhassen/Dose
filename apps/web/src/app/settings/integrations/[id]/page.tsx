"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useIntegrationById, useSyncIntegration, useSyncJobs, useRetrySyncJob, useDisconnectIntegration, useImportBankFile, useImportBulkFile, useBackfillSaleItems } from '@kit/hooks';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@kit/ui/dropdown-menu';
import Link from 'next/link';
import { 
  Square, 
  Wallet,
  FileSpreadsheet,
  Settings,
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Loader2,
  ArrowLeft,
  ShoppingCart,
  CreditCard,
  Package,
  MapPin,
  AlertCircle,
  Trash2,
  MoreVertical,
  Activity,
  Upload,
  X,
  Wrench,
  Database,
} from 'lucide-react';
import { useToast } from '@kit/hooks';
import { cn } from '@kit/lib/utils';
import { formatDateTime } from '@kit/lib/date-format';
import SquareDataView from '../square-data-view';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { SyncPeriodDialog, type SyncPeriodSelection } from './sync-period-dialog';
import {
  BULK_IMPORT_ENTITY_NAMES,
  BULK_IMPORT_ENTITY_LABELS,
  type BulkImportEntity,
} from '@/lib/bulk-import/constants';
import { buildBulkImportExampleCsv, bulkImportTemplateHint } from '@/lib/bulk-import/templates';
import { buildBulkImportExampleXlsxBlob } from '@/lib/bulk-import/example-xlsx';
import { Label } from '@kit/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';

function getStatusBadge(status: string) {
  switch (status) {
    case 'connected':
      return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Connected</Badge>;
    case 'pending':
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case 'error':
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
    case 'disconnected':
      return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Disconnected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getIntegrationIcon(type: string) {
  switch (type) {
    case 'square':
      return Square;
    case 'pennylane':
      return Wallet;
    case 'csv_bank':
      return FileSpreadsheet;
    case 'csv_bulk':
      return Database;
    default:
      return Settings;
  }
}

const ACCEPT_CSV_XLSX = '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function CsvBankImportDropzone({
  file,
  onFileChange,
  onImport,
  isImporting,
}: {
  file: File | null;
  onFileChange: (f: File | null) => void;
  onImport: () => void;
  isImporting: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (selected: FileList | null) => {
    const f = selected?.[0] ?? null;
    if (!f) return;
    const ok = ['.csv', '.xlsx'].some((ext) => f.name.toLowerCase().endsWith(ext)) ||
      ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(f.type);
    if (ok) onFileChange(f);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleSelect(e.dataTransfer.files);
  };

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-dashed transition-colors',
        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_CSV_XLSX}
        className="hidden"
        onChange={(e) => handleSelect(e.target.files)}
      />
      <div className="flex flex-col items-center justify-center gap-3 p-6">
        {!file ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose file
            </Button>
            <p className="text-sm text-muted-foreground">or drag and drop CSV/Excel here</p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium truncate max-w-[200px]" title={file.name}>{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onFileChange(null)}
                aria-label="Remove file"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              onClick={onImport}
              disabled={isImporting}
            >
              {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
              Import file
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function IntegrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  if (!resolvedParams) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return <IntegrationDetailContent id={resolvedParams.id} activeTab={activeTab} setActiveTab={setActiveTab} />;
}

function IntegrationDetailContent({ id, activeTab, setActiveTab }: { id: string; activeTab: string; setActiveTab: (tab: string) => void }) {
  const router = useRouter();
  const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false);
  const [isSyncPeriodOpen, setIsSyncPeriodOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [bulkEntity, setBulkEntity] = useState<BulkImportEntity>('suppliers');
  const { data: integration, isLoading } = useIntegrationById(id);
  const syncIntegration = useSyncIntegration();
  const importBankFile = useImportBankFile();
  const importBulkFile = useImportBulkFile();
  const backfillSaleItems = useBackfillSaleItems();
  const { data: syncJobs = [] } = useSyncJobs(id);
  const retrySyncJob = useRetrySyncJob();
  const disconnectIntegration = useDisconnectIntegration();
  const { toast } = useToast();
  const [backfillProgress, setBackfillProgress] = useState<{ processed: number; total: number | null } | null>(null);

  const lastJob = Array.isArray(syncJobs) ? syncJobs[0] : null;

  const handleSync = async (
    syncType: 'orders' | 'payments' | 'catalog' | 'locations' | 'transactions' | 'full' = 'full',
    period?: SyncPeriodSelection
  ) => {
    try {
      const res = await syncIntegration.mutateAsync({ id, syncType, period });
      const jobId = res?.job_id;
      if (jobId != null) {
        window.location.href = `/settings/integrations/syncs/${jobId}`;
        if (res && 'status' in res && res.status === 'failed') {
          toast({ title: 'Sync failed', description: res.error_message ?? 'See job for details.', variant: 'destructive' });
        } else {
          toast({ title: 'Redirecting to sync…', description: `Job #${jobId}` });
        }
        return;
      }
      if (res && 'status' in res && res.status === 'failed') {
        toast({ title: 'Sync Failed', description: res.error_message ?? 'Fetch failed.', variant: 'destructive' });
      } else {
        toast({ title: 'Sync Started', description: 'Data synchronization has been started.' });
      }
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync data',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast({ title: 'Missing file', description: 'Pick a CSV or .xlsx file first.', variant: 'destructive' });
      return;
    }
    try {
      const res = await importBankFile.mutateAsync({ id, file: importFile });
      if (res?.job_id != null) {
        window.location.href = `/settings/integrations/syncs/${res.job_id}`;
        toast({ title: 'Import started', description: `Job #${res.job_id}` });
      }
    } catch (e: any) {
      toast({ title: 'Import failed', description: e?.message || 'Failed to import file', variant: 'destructive' });
    }
  };

  const downloadBulkExampleCsv = () => {
    const { filename, content } = buildBulkImportExampleCsv(bulkEntity);
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadBulkExampleXlsx = () => {
    const { filename, blob } = buildBulkImportExampleXlsxBlob(bulkEntity);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkImport = async () => {
    if (!bulkImportFile) {
      toast({ title: 'Missing file', description: 'Pick a CSV or .xlsx file first.', variant: 'destructive' });
      return;
    }
    try {
      const res = await importBulkFile.mutateAsync({ id, file: bulkImportFile, entity: bulkEntity });
      if (res?.job_id != null) {
        window.location.href = `/settings/integrations/syncs/${res.job_id}/review`;
        toast({
          title: 'File staged',
          description: (res as { message?: string }).message ?? `Job #${res.job_id} — review before apply.`,
        });
      }
    } catch (e: any) {
      toast({ title: 'Import failed', description: e?.message || 'Failed to import file', variant: 'destructive' });
    }
  };

  const handleBackfill = async () => {
    try {
      let offset = 0;
      const limit = 200;
      const totals = {
        sales_scanned: 0,
        lines_updated: 0,
        movements_written: 0,
        missing_payload: 0,
        unmapped_items: 0,
        errors: 0,
      };
      setBackfillProgress({ processed: 0, total: null });
      while (true) {
        const res = await backfillSaleItems.mutateAsync({ id, offset, limit });
        for (const k of Object.keys(totals) as (keyof typeof totals)[]) {
          totals[k] += res.results[k] ?? 0;
        }
        setBackfillProgress({ processed: offset + res.processed, total: res.total });
        if (!res.has_more || res.next_offset == null) break;
        offset = res.next_offset;
      }
      toast({
        title: 'Backfill complete',
        description: `Scanned ${totals.sales_scanned} sales, patched ${totals.lines_updated} lines, wrote ${totals.movements_written} movements. Unmapped: ${totals.unmapped_items}, errors: ${totals.errors}.`,
      });
    } catch (e: any) {
      toast({ title: 'Backfill failed', description: e?.message || 'Failed', variant: 'destructive' });
    } finally {
      setBackfillProgress(null);
    }
  };

  const handleRetryJob = async (jobId: number) => {
    try {
      await retrySyncJob.mutateAsync(jobId);
      toast({ title: 'Retry Started', description: 'Job has been queued for processing.' });
    } catch (e: any) {
      toast({ title: 'Retry Failed', description: e?.message || 'Failed to retry', variant: 'destructive' });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectIntegration.mutateAsync(id);
      toast({
        title: 'Disconnected',
        description: 'Integration has been disconnected successfully.',
      });
      setIsDisconnectDialogOpen(false);
      router.push('/settings/integrations');
    } catch (error: any) {
      toast({
        title: 'Disconnect Failed',
        description: error.message || 'Failed to disconnect integration',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!integration) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => router.push('/settings/integrations')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Integrations
          </Button>
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Integration not found</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const Icon = getIntegrationIcon(integration.integration_type);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/settings/integrations')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">{integration.name}</h1>
                  <p className="text-muted-foreground mt-1">
                    Manage your {integration.integration_type} integration settings and data
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {integration.integration_type === 'pennylane' ? (
                      <DropdownMenuItem
                        onClick={() => handleSync('transactions')}
                        disabled={syncIntegration.isPending}
                      >
                        {syncIntegration.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Sync bank transactions
                          </>
                        )}
                      </DropdownMenuItem>
                    ) : integration.integration_type === 'square' ? (
                      <>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setIsSyncPeriodOpen(true);
                          }}
                          disabled={syncIntegration.isPending}
                        >
                          {syncIntegration.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Sync All Data
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleSync('orders')}
                          disabled={syncIntegration.isPending}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Sync Orders
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleSync('payments')}
                          disabled={syncIntegration.isPending}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Sync Payments
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleSync('catalog')}
                          disabled={syncIntegration.isPending}
                        >
                          <Package className="w-4 h-4 mr-2" />
                          Sync Catalog
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleSync('locations')}
                          disabled={syncIntegration.isPending}
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          Sync Locations
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={handleBackfill}
                          disabled={backfillSaleItems.isPending || backfillProgress != null}
                        >
                          {backfillProgress ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Backfilling {backfillProgress.processed}
                              {backfillProgress.total != null ? `/${backfillProgress.total}` : ''}…
                            </>
                          ) : (
                            <>
                              <Wrench className="w-4 h-4 mr-2" />
                              Backfill sale stock
                            </>
                          )}
                        </DropdownMenuItem>
                      </>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setIsDisconnectDialogOpen(true)}
                      disabled={disconnectIntegration.isPending}
                      className="text-destructive focus:text-destructive"
                    >
                      {disconnectIntegration.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Disconnecting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Disconnect
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          {getStatusBadge(integration.status)}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {integration.integration_type === 'square' && (
              <TabsTrigger value="data">Data</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Connection Status</CardTitle>
                <CardDescription>Current status and health of your integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(integration.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Connected</p>
                    <p className="text-sm font-medium mt-1">{formatDateTime(integration.created_at)}</p>
                  </div>
                  {integration.token_expires_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Token Expires</p>
                      <p className="text-sm font-medium mt-1">{formatDateTime(integration.token_expires_at)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Sync Frequency</p>
                    <p className="text-sm font-medium mt-1 capitalize">{integration.sync_frequency || 'Manual'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {(integration.integration_type === 'pennylane' || integration.integration_type === 'csv_bank') && (
              <Card>
                <CardHeader>
                  <CardTitle>Bank transactions</CardTitle>
                  <CardDescription>View and reconcile imported bank statement lines</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" asChild>
                    <Link href={`/bank-transactions?integration_id=${integration.id}`}>View bank transactions</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {integration.integration_type === 'csv_bank' && (
              <Card>
                <CardHeader>
                  <CardTitle>Import bank statement</CardTitle>
                  <CardDescription>Upload a CSV or Excel (.xlsx) file. We’ll store the original file and import its transactions.</CardDescription>
                </CardHeader>
                <CardContent>
                  <CsvBankImportDropzone
                    onImport={handleImport}
                    file={importFile}
                    onFileChange={setImportFile}
                    isImporting={importBankFile.isPending}
                  />
                  <p className="text-xs text-muted-foreground mt-3">
                    Each import creates a sync job and bank transactions.
                  </p>
                </CardContent>
              </Card>
            )}

            {integration.integration_type === 'csv_bulk' && (
              <Card>
                <CardHeader>
                  <CardTitle>Bulk data import</CardTitle>
                  <CardDescription>
                    Choose what you are importing, download the example file for that entity, then upload your CSV or
                    Excel (.xlsx).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 max-w-md">
                    <Label htmlFor="bulk-entity">Entity to import</Label>
                    <Select value={bulkEntity} onValueChange={(v) => setBulkEntity(v as BulkImportEntity)}>
                      <SelectTrigger id="bulk-entity">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BULK_IMPORT_ENTITY_NAMES.map((key) => (
                          <SelectItem key={key} value={key}>
                            {BULK_IMPORT_ENTITY_LABELS[key]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-sm text-muted-foreground">{bulkImportTemplateHint(bulkEntity)}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={downloadBulkExampleCsv}>
                      Download example (.csv)
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={downloadBulkExampleXlsx}>
                      Download example (.xlsx)
                    </Button>
                  </div>
                  <CsvBankImportDropzone
                    onImport={handleBulkImport}
                    file={bulkImportFile}
                    onFileChange={setBulkImportFile}
                    isImporting={importBulkFile.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Recipes and supplier orders: use the two-sheet Excel layout (see downloaded .xlsx). Other entities
                    use a single sheet or CSV.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Sync Jobs Card */}
            <Card>
              <CardHeader>
                <CardTitle>Sync Information</CardTitle>
                <CardDescription>Last sync job status and history</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {lastJob ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Job #{lastJob.id}</p>
                        <p className="text-sm font-medium mt-1">{formatDateTime(lastJob.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <div className="flex items-center gap-2 mt-1">
                          {lastJob.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          {lastJob.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                          {(lastJob.status === 'pending' || lastJob.status === 'processing') && (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          )}
                          <Badge variant={lastJob.status === 'failed' ? 'destructive' : lastJob.status === 'completed' ? 'default' : 'secondary'}>
                            {lastJob.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {lastJob.stats && typeof lastJob.stats === 'object' && (
                      <p className="text-sm text-muted-foreground">
                        Imported: {[lastJob.stats.imported, lastJob.stats.items_imported, lastJob.stats.orders_imported, lastJob.stats.payments_imported, lastJob.stats.transactions_imported].filter((x) => x != null).join(', ') || '—'}
                        {(lastJob.stats.items_failed || lastJob.stats.orders_failed || lastJob.stats.payments_failed) ? (
                          <span className="text-destructive ml-2">
                            Failed: {[lastJob.stats.items_failed, lastJob.stats.orders_failed, lastJob.stats.payments_failed].filter(Boolean).join(', ')}
                          </span>
                        ) : null}
                      </p>
                    )}
                    {lastJob.error_message && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{lastJob.error_message}</AlertDescription>
                      </Alert>
                    )}
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/settings/integrations/syncs?integration_id=${id}`}>
                          <Activity className="w-4 h-4 mr-1" />
                          View all syncs
                        </Link>
                      </Button>
                      {(lastJob.status === 'failed' || lastJob.status === 'completed') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryJob(lastJob.id)}
                          disabled={retrySyncJob.isPending}
                        >
                          {retrySyncJob.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                          Retry
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No sync jobs yet. Use Sync from the menu above.</p>
                )}
              </CardContent>
            </Card>

            {/* Configuration Card */}
            {integration.config && Object.keys(integration.config).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Configuration</CardTitle>
                  <CardDescription>Integration-specific settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(integration.config).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-2 border-b last:border-0">
                        <span className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-mono">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {integration.integration_type === 'square' && (
            <TabsContent value="data">
              <SquareDataView 
                integrationId={id} 
                onSync={handleSync}
                isSyncing={syncIntegration.isPending}
              />
            </TabsContent>
          )}
        </Tabs>
        <ConfirmationDialog
          open={isDisconnectDialogOpen}
          onOpenChange={setIsDisconnectDialogOpen}
          onConfirm={handleDisconnect}
          title="Disconnect integration"
          description="Are you sure you want to disconnect this integration? This will remove all connection data."
          confirmText="Disconnect"
          cancelText="Cancel"
          isPending={disconnectIntegration.isPending}
          variant="destructive"
        />
        {integration.integration_type === 'square' && (
          <SyncPeriodDialog
            open={isSyncPeriodOpen}
            onOpenChange={setIsSyncPeriodOpen}
            lastSyncAt={integration.last_sync_at}
            isPending={syncIntegration.isPending}
            onConfirm={async (selection) => {
              setIsSyncPeriodOpen(false);
              await handleSync('full', selection);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}

