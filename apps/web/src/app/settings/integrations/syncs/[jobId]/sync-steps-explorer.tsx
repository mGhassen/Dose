'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useSyncJobFamily, useSyncFamilySteps, useSyncStepEntries } from '@kit/hooks';
import type { SyncFamilyStep, SyncJobFamilyMember } from '@kit/types';
import { Checkbox } from '@kit/ui/checkbox';
import { Label } from '@kit/ui/label';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@kit/ui/resizable';
import { Loader2, Radio } from 'lucide-react';
import { isRunningSyncStatus } from '@kit/lib/sync-job-utils';
import { SyncJobTreeSidebar } from './sync-job-tree-sidebar';
import { SyncStepsFilterBar, type StepFilters } from './sync-steps-filter-sidebar';
import { SyncStepsTimeline } from './sync-steps-timeline';
import { SyncStepsList } from './sync-steps-list';
import { SyncStepEntriesPanel } from './sync-step-entries-panel';
import { SyncJobInfoPanel } from './sync-job-info-panel';
import { SyncEntryDetailPanel } from './sync-entry-detail-panel';
import { filterSteps } from './sync-steps-utils';

type Props = {
  anchorJobId: number;
};

export function SyncStepsExplorer({ anchorJobId }: Props) {
  const { data: family, isLoading: familyLoading } = useSyncJobFamily(anchorJobId);

  const [allJobsSelected, setAllJobsSelected] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [infoJob, setInfoJob] = useState<SyncJobFamilyMember | null>(null);
  const [selectedStep, setSelectedStep] = useState<SyncFamilyStep | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const [scrollToStepId, setScrollToStepId] = useState<number | null>(null);
  const [filters, setFilters] = useState<StepFilters>({
    status: 'all',
    phase: 'all',
    search: '',
    errorsOnly: false,
  });

  const jobIdsFilter = allJobsSelected ? null : selectedJobId ? [selectedJobId] : null;
  const { data: stepsData, isLoading: stepsLoading } = useSyncFamilySteps(
    anchorJobId,
    jobIdsFilter
  );

  const jobsById = useMemo(() => {
    const m = new Map<number, SyncJobFamilyMember>();
    for (const j of family?.jobs ?? []) m.set(j.id, j);
    return m;
  }, [family?.jobs]);

  const filteredSteps = useMemo(() => {
    return filterSteps(stepsData?.steps ?? [], {
      ...filters,
      jobIds: jobIdsFilter,
    });
  }, [stepsData?.steps, filters, jobIdsFilter]);

  const anyRunning = family?.jobs?.some((j) => isRunningSyncStatus(j.status)) ?? false;

  useEffect(() => {
    if (!autoFollow || !anyRunning) return;
    const running = [...filteredSteps].reverse().find((s) => s.status === 'running');
    if (running) {
      setScrollToStepId(running.id);
      if (!selectedStep || selectedStep.status === 'running') {
        setSelectedStep(running);
      }
    }
  }, [filteredSteps, autoFollow, anyRunning, selectedStep]);

  const handleSelectJob = (jobId: number | null, all: boolean) => {
    setAllJobsSelected(all);
    setSelectedJobId(jobId);
    setInfoJob(null);
    setSelectedStep(null);
    setSelectedEntryId(null);
  };

  const handleBucketClick = useCallback(
    (startMs: number) => {
      const step = filteredSteps.find((s) => {
        const t = new Date(s.updated_at || s.created_at).getTime();
        return t >= startMs;
      });
      if (step) {
        setSelectedStep(step);
        setScrollToStepId(step.id);
      }
    },
    [filteredSteps]
  );

  if (familyLoading && !family) {
    return (
      <div className="flex items-center justify-center flex-1 min-h-[320px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const jobs = family?.jobs ?? [];

  return (
    <div className="flex flex-col flex-1 min-h-0 border rounded-lg overflow-hidden bg-background">
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0 gap-2">
        <div className="flex items-center gap-2 text-sm">
          {anyRunning && (
            <span className="flex items-center gap-1.5 text-primary text-xs font-medium">
              <Radio className="h-3 w-3 animate-pulse" />
              Live
            </span>
          )}
          <span className="text-muted-foreground text-xs">
            {filteredSteps.length} steps
            {stepsLoading && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="auto-follow"
            checked={autoFollow}
            onCheckedChange={(c) => setAutoFollow(c === true)}
          />
          <Label htmlFor="auto-follow" className="text-xs font-normal cursor-pointer">
            Auto-follow running
          </Label>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-52 shrink-0 flex flex-col min-h-0">
          <SyncJobTreeSidebar
            jobs={jobs}
            selectedJobId={selectedJobId}
            allJobsSelected={allJobsSelected}
            onSelectJob={handleSelectJob}
            onJobInfo={(job) => {
              setInfoJob(job);
              setSelectedEntryId(null);
            }}
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <SyncStepsFilterBar filters={filters} onChange={setFilters} />
          <SyncStepsTimeline steps={filteredSteps} onBucketClick={handleBucketClick} />

          <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0">
            <ResizablePanel defaultSize={55} minSize={25}>
              <div className="flex h-full min-h-0">
                <div className="flex-1 min-w-0 flex flex-col min-h-0">
                  <SyncStepsList
                    steps={filteredSteps}
                    jobsById={jobsById}
                    selectedStepId={selectedStep?.id ?? null}
                    onSelectStep={(step) => {
                      setSelectedStep(step);
                      setSelectedEntryId(null);
                      setInfoJob(null);
                    }}
                    scrollToStepId={scrollToStepId}
                    showJobColumn={allJobsSelected || jobs.length > 1}
                  />
                </div>
                {infoJob && (
                  <SyncJobInfoPanel job={infoJob} onClose={() => setInfoJob(null)} />
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={45} minSize={20}>
              <div className="flex h-full min-h-0">
                <div className="flex-1 min-w-0 min-h-0">
                  <SyncStepEntriesPanel
                    anchorJobId={anchorJobId}
                    step={selectedStep}
                    selectedEntryId={selectedEntryId}
                    onSelectEntry={(id) => {
                      setSelectedEntryId(id);
                      setInfoJob(null);
                    }}
                  />
                </div>
                {selectedEntryId != null && selectedStep && (
                  <EntryDetailWrapper
                    anchorJobId={anchorJobId}
                    stepId={selectedStep.id}
                    entryId={selectedEntryId}
                    onClose={() => setSelectedEntryId(null)}
                    onNavigate={setSelectedEntryId}
                  />
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
}

function EntryDetailWrapper({
  anchorJobId,
  stepId,
  entryId,
  onClose,
  onNavigate,
}: {
  anchorJobId: number;
  stepId: number;
  entryId: number;
  onClose: () => void;
  onNavigate: (id: number) => void;
}) {
  const { data } = useSyncStepEntries(anchorJobId, stepId, { limit: 100, offset: 0 });
  const entry = data?.entries.find((e) => e.id === entryId);
  if (!entry) return null;
  return (
    <SyncEntryDetailPanel
      entry={entry}
      entries={data?.entries ?? []}
      onClose={onClose}
      onNavigate={onNavigate}
    />
  );
}
