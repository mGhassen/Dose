import {
  getActiveStagingSourceIdsBatch,
  getMappedSourceIdsBatch,
  getProcessedStagingSourceIdsBatch,
} from '@/app/api/integrations/[id]/sync/square-import';

export type StagingEntityKey = {
  data_type: string;
  source_id: string;
};

export const CATALOG_MAPPING_SOURCE_TYPES = [
  'catalog_item',
  'catalog_variation',
  'catalog_category',
  'catalog_modifier',
  'catalog_modifier_list',
  'catalog_modifier_item',
  'catalog_tax',
] as const;

export function mappingSourceTypesForDataType(dataType: string): string[] {
  switch (dataType) {
    case 'order':
      return ['order'];
    case 'payment':
      return ['payment'];
    case 'catalog_object':
      return [...CATALOG_MAPPING_SOURCE_TYPES];
    default:
      return [];
  }
}

export function stagingKeysFromRows(
  rows: { data_type: string; source_id: string }[]
): StagingEntityKey[] {
  const seen = new Set<string>();
  const out: StagingEntityKey[] = [];
  for (const row of rows) {
    const sourceId = row.source_id?.trim();
    if (!sourceId) continue;
    const key = `${row.data_type}:${sourceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ data_type: row.data_type, source_id: sourceId });
  }
  return out;
}

export type SquareStagingInsertRow = {
  job_id: number;
  integration_id: number;
  data_type: string;
  source_id: string;
  payload: unknown;
  step_id?: number;
};

export type StagingFilterResult = {
  rows: SquareStagingInsertRow[];
  skipped_already_imported: number;
  skipped_already_processed: number;
  skipped_cross_job_active: number;
};

type SupabaseClient = { from: (table: string) => any; rpc?: (fn: string, args: object) => any };

export async function filterKnownStagingRows(
  supabase: SupabaseClient,
  integrationId: number,
  stagingJobId: number,
  rows: Omit<SquareStagingInsertRow, 'integration_id'>[]
): Promise<StagingFilterResult> {
  if (rows.length === 0) {
    return {
      rows: [],
      skipped_already_imported: 0,
      skipped_already_processed: 0,
      skipped_cross_job_active: 0,
    };
  }

  const byDataType = new Map<string, Omit<SquareStagingInsertRow, 'integration_id'>[]>();
  for (const row of rows) {
    const sourceId = row.source_id?.trim();
    if (!sourceId) continue;
    const list = byDataType.get(row.data_type) ?? [];
    list.push(row);
    byDataType.set(row.data_type, list);
  }

  let skipped_already_imported = 0;
  let skipped_already_processed = 0;
  let skipped_cross_job_active = 0;
  const kept: SquareStagingInsertRow[] = [];

  for (const [dataType, typeRows] of byDataType) {
    const sourceIds = typeRows.map((r) => r.source_id).filter(Boolean);
    const sourceTypes = mappingSourceTypesForDataType(dataType);

    const [mappedIds, processedIds, activeIds] = await Promise.all([
      getMappedSourceIdsBatch(supabase, integrationId, sourceTypes, sourceIds),
      getProcessedStagingSourceIdsBatch(supabase, integrationId, dataType, sourceIds),
      getActiveStagingSourceIdsBatch(supabase, integrationId, stagingJobId, dataType, sourceIds),
    ]);

    for (const row of typeRows) {
      const sid = row.source_id;
      if (mappedIds.has(sid)) {
        skipped_already_imported += 1;
        continue;
      }
      if (processedIds.has(sid)) {
        skipped_already_processed += 1;
        continue;
      }
      if (activeIds.has(sid)) {
        skipped_cross_job_active += 1;
        continue;
      }
      kept.push({ ...row, integration_id: integrationId });
    }
  }

  return {
    rows: kept,
    skipped_already_imported,
    skipped_already_processed,
    skipped_cross_job_active,
  };
}
