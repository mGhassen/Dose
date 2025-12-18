import { setupWorker } from 'msw/browser';
import { authHandlers } from './handlers/auth';
import { 
  debugHandlers,
  actionTypesHandlers,
  actionRefTypesHandlers,
  actionsHandlers,
  actsHandlers,
  objectsHandlers,
  objectsSpecialHandlers,
  objectsFiltersHandlers,
  locationsHandlers,
  locationsApiHandlers,
  locationsSpecialHandlers,
  eventsHandlers,
  operationTypesHandlers,
  checklistsHandlers,
  locomotiveModelsHandlers,
  locomotivesHandlers,
  usersHandlers,
  profilesHandlers,
  anomaliesHandlers,
  assetItemsHandlers,
  assetModelsHandlers,
  actionReferencesHandlers,
  proceduresHandlers,
  proceduresSpecialHandlers,
  questionsHandlers,
  responsesHandlers,
  issuesHandlers,
  operationsHandlers,
  locationLevelsHandlers,
  locationLevelsSpecialHandlers,
  metadataEnumsHandlers
} from './handlers/dose';

// Runtime check for migration config (at MSW startup, not module load)
const shouldUseMSWForFunctionality = (functionality: string): boolean => {
  const globalMSWEnabled = process.env.NEXT_PUBLIC_ENABLE_MSW !== 'false';
  const envKey = `NEXT_PUBLIC_MIGRATION_USE_API_${functionality.toUpperCase()}`;
  
  // Preferred: read server-injected migration config
  const windowUseAPI = typeof window !== 'undefined' ? (window as any).__MIGRATION__?.[functionality] : undefined;
  
  // Fallbacks: process.env (Next bundled) or __NEXT_DATA__ env
  const useAPIEnv =
    windowUseAPI !== undefined
      ? (windowUseAPI ? 'true' : 'false')
      : (process.env[envKey] || (typeof window !== 'undefined' ? (window as any).__NEXT_DATA__?.env?.[envKey] : undefined));
  const useAPI = useAPIEnv === 'true';
  const shouldUse = globalMSWEnabled && !useAPI;
  
  
  
  if (useAPIEnv === undefined && functionality === 'events') {
    console.error(`[MSW Runtime Config] CRITICAL: Events env var is UNDEFINED!`);
    console.error(`[MSW Runtime Config] Available NEXT_PUBLIC_ vars:`, Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')).slice(0, 10));
  }
  
  return shouldUse;
};

// Filter handlers at runtime based on migration config
const getFilteredHandlers = () => {
  const handlers = [
    ...debugHandlers,
    ...(shouldUseMSWForFunctionality('actiontypes') ? actionTypesHandlers : []),
    ...(shouldUseMSWForFunctionality('actionreftypes') ? actionRefTypesHandlers : []),
    ...(shouldUseMSWForFunctionality('actions') ? actionsHandlers : []),
    ...(shouldUseMSWForFunctionality('acts') ? actsHandlers : []),
    ...(shouldUseMSWForFunctionality('objects') ? [
      ...objectsSpecialHandlers,
      ...objectsFiltersHandlers,
      ...objectsHandlers
    ] : []),
    ...(shouldUseMSWForFunctionality('locations') ? [
      ...locationsApiHandlers, // Must come first to override createCrudHandlers POST
      ...locationsHandlers,
      ...locationsApiHandlers,
      ...locationsSpecialHandlers
    ] : []),
    ...(shouldUseMSWForFunctionality('events') ? eventsHandlers : []),
    ...(shouldUseMSWForFunctionality('operationtypes') ? operationTypesHandlers : []),
    ...(shouldUseMSWForFunctionality('checklists') ? checklistsHandlers : []),
    ...(shouldUseMSWForFunctionality('locomotivemodels') ? locomotiveModelsHandlers : []),
    ...(shouldUseMSWForFunctionality('locomotives') ? locomotivesHandlers : []),
    ...(shouldUseMSWForFunctionality('users') ? usersHandlers : []),
    ...(shouldUseMSWForFunctionality('profiles') ? profilesHandlers : []),
    ...(shouldUseMSWForFunctionality('anomalies') ? anomaliesHandlers : []),
    ...(shouldUseMSWForFunctionality('assetitems') ? assetItemsHandlers : []),
    ...(shouldUseMSWForFunctionality('assetmodels') ? assetModelsHandlers : []),
    ...(shouldUseMSWForFunctionality('actionreferences') ? actionReferencesHandlers : []),
    ...(shouldUseMSWForFunctionality('procedures') ? [
      ...proceduresHandlers,
      ...proceduresSpecialHandlers
    ] : []),
    ...(shouldUseMSWForFunctionality('questions') ? questionsHandlers : []),
    ...(shouldUseMSWForFunctionality('responses') ? responsesHandlers : []),
    ...(shouldUseMSWForFunctionality('issues') ? issuesHandlers : []),
    ...(shouldUseMSWForFunctionality('operations') ? operationsHandlers : []),
    ...(shouldUseMSWForFunctionality('locationlevels') ? [
      ...locationLevelsHandlers,
      ...locationLevelsSpecialHandlers
    ] : []),
    ...(shouldUseMSWForFunctionality('metadataEnums') ? metadataEnumsHandlers : [])
  ];
  
  
  
  return handlers;
};

// This configures a Service Worker with the given request handlers.
// Handlers are filtered at runtime based on migration config
export const worker = setupWorker(...authHandlers, ...getFilteredHandlers());
