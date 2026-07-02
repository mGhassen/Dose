'use client';

import React, { useMemo } from 'react';
import type { SyncStepEntry } from '@kit/types';
import { Button } from '@kit/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { X, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@kit/hooks';

type Props = {
  entry: SyncStepEntry;
  entries: SyncStepEntry[];
  onClose: () => void;
  onNavigate: (entryId: number) => void;
};

export function SyncEntryDetailPanel({ entry, entries, onClose, onNavigate }: Props) {
  const { toast } = useToast();
  const idx = useMemo(() => entries.findIndex((e) => e.id === entry.id), [entries, entry.id]);

  const copyJson = () => {
    try {
      void navigator.clipboard.writeText(JSON.stringify(entry.payload, null, 2));
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col h-full border-l bg-background w-80 shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0 gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={idx <= 0}
            onClick={() => idx > 0 && onNavigate(entries[idx - 1].id)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={idx < 0 || idx >= entries.length - 1}
            onClick={() => idx < entries.length - 1 && onNavigate(entries[idx + 1].id)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyJson}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3 py-2 border-b text-xs space-y-1 shrink-0">
        <p className="font-mono font-medium truncate">{entry.source_id}</p>
        <p className="text-muted-foreground">{entry.data_type}</p>
      </div>

      {entry.error_message && (
        <Alert variant="destructive" className="m-2 py-2">
          <AlertDescription className="text-xs">{entry.error_message}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-2 mt-2 grid w-auto grid-cols-2">
          <TabsTrigger value="overview" className="text-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="raw" className="text-xs">
            Raw JSON
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="flex-1 overflow-auto p-3 mt-0 text-xs space-y-2">
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
            <dt className="text-muted-foreground">ID</dt>
            <dd className="font-mono">{entry.id}</dd>
            <dt className="text-muted-foreground">Processed</dt>
            <dd>{entry.processed_at ?? '—'}</dd>
            <dt className="text-muted-foreground">Skip reason</dt>
            <dd>{entry.skip_reason ?? '—'}</dd>
          </dl>
        </TabsContent>
        <TabsContent value="raw" className="flex-1 overflow-auto p-2 mt-0">
          <pre className="text-[10px] font-mono whitespace-pre-wrap break-all">
            {JSON.stringify(entry.payload, null, 2)}
          </pre>
        </TabsContent>
      </Tabs>
    </div>
  );
}
