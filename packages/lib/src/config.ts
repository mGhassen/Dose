/**
 * Centralized configuration for the entire application
 * All currency, locale, and formatting settings should be defined here
 */

// Currency configuration
export const CURRENCY = {
  code: process.env.NEXT_PUBLIC_CURRENCY_CODE || 'TND',
  symbol: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'TND',
  locale: process.env.NEXT_PUBLIC_CURRENCY_LOCALE || 'fr-FR', // French locale for better TND support
};

// Date and time configuration
export const LOCALE = {
  date: process.env.NEXT_PUBLIC_DATE_LOCALE || 'fr-FR', // French locale
  time: process.env.NEXT_PUBLIC_TIME_LOCALE || 'fr-FR',
  timezone: process.env.NEXT_PUBLIC_TIMEZONE || 'Africa/Tunis',
};

// Add a comment about environment variables
// Add these to your .env.local file:
// NEXT_PUBLIC_CURRENCY_CODE=TND
// NEXT_PUBLIC_CURRENCY_SYMBOL=TND
// NEXT_PUBLIC_CURRENCY_LOCALE=fr-FR
// NEXT_PUBLIC_DATE_LOCALE=fr-FR
// NEXT_PUBLIC_TIME_LOCALE=fr-FR
// NEXT_PUBLIC_TIMEZONE=Africa/Tunis

// Formatting options
export const FORMAT_OPTIONS = {
  currency: {
    style: 'currency' as const,
    currency: CURRENCY.code,
    locale: CURRENCY.locale,
  },
  number: {
    locale: CURRENCY.locale,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
  date: {
    locale: LOCALE.date,
    timeZone: LOCALE.timezone,
  },
  time: {
    locale: LOCALE.time,
    timeZone: LOCALE.timezone,
  },
};

// Utility functions for consistent formatting
export const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '0,00 TND';
  
  // Format the number with French locale (comma as decimal separator)
  const formattedNumber = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
  
  // Always append TND
  const result = `${formattedNumber} TND`;
  
  return result;
};

export const formatNumber = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '0.00';
  
  return new Intl.NumberFormat(FORMAT_OPTIONS.number.locale, {
    minimumFractionDigits: FORMAT_OPTIONS.number.minimumFractionDigits,
    maximumFractionDigits: FORMAT_OPTIONS.number.maximumFractionDigits,
  }).format(numAmount);
};

// Export commonly used values
export const CURRENCY_SYMBOL = CURRENCY.symbol;
export const CURRENCY_CODE = CURRENCY.code;
export const DATE_LOCALE = LOCALE.date;
export const TIME_LOCALE = LOCALE.time;
export const TIMEZONE = LOCALE.timezone;

// ============================================================================
// MIGRATION CONFIGURATION
// ============================================================================
// During migration from MSW to real API, this config allows per-functionality
// control over which uses MSW (mocks) and which uses the real API.
// 
// Usage:
// - Set MIGRATION_USE_API_<FUNCTIONALITY>=true to use real API
// - Omit or set to false to use MSW (mocks)
//
// Functionalities are named using their API endpoint names (e.g., 'events', 'users')
// ============================================================================

// Functionality names matching API endpoints
export type FunctionalityName =
  | 'events'
  | 'users'
  | 'actiontypes'
  | 'actionreftypes'
  | 'actionreferences'
  | 'actions'
  | 'acts'
  | 'anomalies'
  | 'checklists'
  | 'locomotives'
  | 'locomotivemodels'
  | 'locations'
  | 'locationlevels'
  | 'objects'
  | 'operationtypes'
  | 'operations'
  | 'procedures'
  | 'questions'
  | 'responses'
  | 'issues'
  | 'assetitems'
  | 'assetmodels'
  | 'metadataEnums'
  | 'profiles'
  | 'settings'
  | 'auth';

// Migration configuration - maps functionality to whether it should use API (true) or MSW (false)
const computeMigrationConfig = (): Record<FunctionalityName, boolean> => {
  // Helper to check env var - returns true if explicitly set to 'true'
  const checkShouldUseAPI = (name: FunctionalityName): boolean => {
    const envVar = process.env[`MIGRATION_USE_API_${name.toUpperCase()}`];
    return envVar === 'true';
  };

  return {
    events: checkShouldUseAPI('events'),
    users: checkShouldUseAPI('users'),
    actiontypes: checkShouldUseAPI('actiontypes'),
    actionreftypes: checkShouldUseAPI('actionreftypes'),
    actionreferences: checkShouldUseAPI('actionreferences'),
    actions: checkShouldUseAPI('actions'),
    acts: checkShouldUseAPI('acts'),
    anomalies: checkShouldUseAPI('anomalies'),
    checklists: checkShouldUseAPI('checklists'),
    locomotives: checkShouldUseAPI('locomotives'),
    locomotivemodels: checkShouldUseAPI('locomotivemodels'),
    locations: checkShouldUseAPI('locations'),
    locationlevels: checkShouldUseAPI('locationlevels'),
    objects: checkShouldUseAPI('objects'),
    operationtypes: checkShouldUseAPI('operationtypes'),
    operations: checkShouldUseAPI('operations'),
    procedures: checkShouldUseAPI('procedures'),
    questions: checkShouldUseAPI('questions'),
    responses: checkShouldUseAPI('responses'),
    issues: checkShouldUseAPI('issues'),
    assetitems: checkShouldUseAPI('assetitems'),
    assetmodels: checkShouldUseAPI('assetmodels'),
    metadataEnums: checkShouldUseAPI('metadataEnums'),
    profiles: checkShouldUseAPI('profiles'),
    settings: checkShouldUseAPI('settings'),
    auth: checkShouldUseAPI('auth'),
  };
};

// Cached migration config (only computed once)
let migrationConfigCache: Record<FunctionalityName, boolean> | null = null;

/**
 * Get the migration configuration for all functionalities
 * @returns Record mapping functionality names to whether they use API (true) or MSW (false)
 */
export const getMigrationConfig = (): Record<FunctionalityName, boolean> => {
  if (!migrationConfigCache) {
    migrationConfigCache = computeMigrationConfig();
  }
  return migrationConfigCache;
};

/**
 * Check if a functionality should use the real API or MSW (mocks)
 * @param functionality - The functionality name (API endpoint name)
 * @returns true if should use API, false if should use MSW
 */
export const shouldUseAPI = (functionality: FunctionalityName): boolean => {
  const config = getMigrationConfig();
  return config[functionality] ?? false; // Default to MSW (false) if not configured
};

/**
 * Check if a functionality should use MSW (mocks)
 * @param functionality - The functionality name (API endpoint name)
 * @returns true if should use MSW, false if should use API
 */
export const shouldUseMSW = (functionality: FunctionalityName): boolean => {
  return !shouldUseAPI(functionality);
};

/**
 * Get all functionalities that are using API
 */
export const getAPIFunctionalities = (): FunctionalityName[] => {
  const config = getMigrationConfig();
  return (Object.keys(config) as FunctionalityName[]).filter(
    (func) => config[func]
  );
};

/**
 * Get all functionalities that are using MSW
 */
export const getMSWFunctionalities = (): FunctionalityName[] => {
  const config = getMigrationConfig();
  return (Object.keys(config) as FunctionalityName[]).filter(
    (func) => !config[func]
  );
};
