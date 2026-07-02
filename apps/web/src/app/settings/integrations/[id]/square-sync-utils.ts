export type SquareSyncType = 'orders' | 'payments' | 'catalog' | 'locations' | 'full';

export type SyncScope = {
  catalog: boolean;
  orders: boolean;
  payments: boolean;
  locations: boolean;
};

export function emptyScope(): SyncScope {
  return { catalog: false, orders: false, payments: false, locations: false };
}

export function allScope(): SyncScope {
  return { catalog: true, orders: true, payments: true, locations: true };
}

export function hasScopeSelection(scope: SyncScope): boolean {
  return scope.catalog || scope.orders || scope.payments || scope.locations;
}

export function isSyncAllScope(scope: SyncScope): boolean {
  return scope.catalog && scope.orders && scope.payments && scope.locations;
}

/** Catalog + orders + payments → one full job; otherwise one job per checked type. */
export function resolveSyncJobs(scope: SyncScope): SquareSyncType[] {
  if (!hasScopeSelection(scope)) return [];
  if (scope.catalog && scope.orders && scope.payments) {
    return scope.locations ? ['full', 'locations'] : ['full'];
  }
  const jobs: SquareSyncType[] = [];
  if (scope.catalog) jobs.push('catalog');
  if (scope.orders) jobs.push('orders');
  if (scope.payments) jobs.push('payments');
  if (scope.locations) jobs.push('locations');
  return jobs;
}

export function scopeNeedsPeriod(scope: SyncScope): boolean {
  return resolveSyncJobs(scope).includes('full');
}

export function scopeNeedsCatalogStep(scope: SyncScope): boolean {
  return scope.catalog;
}
