import { z } from "zod";

// ============================================================================
// Common Schemas
// ============================================================================

export const attributeSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
});

export const localizationSchema = z.object({
  id: z.number().min(1, "Location ID is required"),
});

export const mediaUploadSchema = z.object({
  comment: z.string().optional(),
  file: z.string().optional(),
});

// ============================================================================
// Action Schemas
// ============================================================================

export const createActionSchema = z.object({
  actionReferenceId: z.number().min(1, "Action Reference is required"),
  localisationId: z.number().min(1, "Localisation is required"),
  operationId: z.number().min(1, "Operation is required"),
  sequence: z.number().int().min(0, "Sequence must be a non-negative integer"),
  comment: z.string().nullable().optional(),
  isMandatory: z.boolean().optional().default(false),
});

export const updateActionSchema = z.object({
  actionReferenceId: z.number().min(1).optional(),
  localisationId: z.number().min(1).optional(),
  operationId: z.number().min(1).optional(),
  sequence: z.number().int().min(0).optional(),
  comment: z.string().nullable().optional(),
  isMandatory: z.boolean().optional(),
});

// ============================================================================
// Object Schemas
// ============================================================================

export const createObjectSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  localizations: z.array(localizationSchema).min(1, "At least one location is required"),
  mediaId: z.number().int().positive().optional(),
  attributes: z.array(attributeSchema).optional(),
});

export const updateObjectSchema = z.object({
  id: z.number().int().positive(),
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  localizations: z.array(localizationSchema).min(1, "At least one location is required").optional(),
  mediaId: z.number().int().positive().optional(),
  attributes: z.array(attributeSchema).optional(),
});

// ============================================================================
// Operation Schemas
// ============================================================================

export const operationStatusSchema = z.union([z.literal(1), z.literal(2)]);

export const createOperationSchema = z.object({
  name: z.string().nullable(), // Required by Swagger but nullable
  operationTypeId: z.number().int().min(1, "Operation Type is required"),
  procedureId: z.number().int().positive().optional(),
  sequence: z.number().int().min(0).optional(),
  description: z.string().nullable().optional(),
  comments: z.string().nullable().optional(),
  // Note: 'from' and 'to' are not part of OperationCreateDTO according to Swagger
});

export const updateOperationSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).nullable().optional(),
  operationTypeId: z.number().min(1).optional(),
  procedureId: z.number().int().positive().optional(),
  sequence: z.number().int().min(0).optional(),
  description: z.string().nullable().optional(),
  comments: z.string().nullable().optional(),
  from: z.string().datetime().nullable().optional(),
  to: z.string().datetime().nullable().optional(),
});

// ============================================================================
// Procedure Schemas
// ============================================================================

export const procedureTypeSchema = z.literal(1);
export const procedureStatusSchema = z.union([
  z.literal(1), // Draft
  z.literal(2), // Validated
  z.literal(3), // Active
  z.literal(4), // Inactive
  z.literal(5)  // Archived
]);

export const createProcedureSchema = z.object({
  name: z.string().min(1, "Name is required"),
  version: z.string().min(1, "Version is required"),
  assetItemId: z.number().int().positive(),
  assetModelId: z.number().int().positive(),
  eventId: z.number().int().positive(),
  description: z.string().optional(),
  procedureTypeId: procedureTypeSchema.optional().default(1),
  statusId: procedureStatusSchema.optional().default(1),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
}).refine((data) => {
  if (data.to && data.from) {
    return new Date(data.to) >= new Date(data.from);
  }
  return true;
}, {
  message: "End date must be after or equal to start date",
  path: ["to"],
});

export const updateProcedureSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).optional(),
  version: z.string().min(1).optional(),
  description: z.string().optional(),
  assetItemId: z.number().int().positive().optional(),
  assetModelId: z.number().int().positive().optional(),
  eventId: z.number().int().positive().optional(),
  procedureTypeId: procedureTypeSchema.optional(),
  statusId: procedureStatusSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
}).refine((data) => {
  if (data.to && data.from) {
    return new Date(data.to) >= new Date(data.from);
  }
  return true;
}, {
  message: "End date must be after or equal to start date",
  path: ["to"],
});

// ============================================================================
// Question Schemas
// ============================================================================

export const createQuestionSchema = z.object({
  value: z.string().nullable(),
  operationId: z.number().int().positive().optional(),
  currentActionId: z.number().int().positive().optional(),
});

export const updateQuestionSchema = z.object({
  id: z.number().int().positive(),
  value: z.string().nullable().optional(),
  operationId: z.number().int().positive().optional(),
  currentActionId: z.number().int().positive().optional(),
});

// ============================================================================
// Action Reference Schemas
// ============================================================================

export const createActionReferenceSchema = z.object({
  actionRefTypeId: z.number().int().positive(),
  actId: z.number().int().positive(),
  responseId: z.number().int().positive(),
  description: z.string().optional(),
  objectIds: z.array(z.number().int().positive()).optional(),
  issueCodes: z.array(z.number().int().positive()).optional(),
  media: mediaUploadSchema.optional(),
});

export const updateActionReferenceSchema = z.object({
  id: z.number().int().positive(),
  actionRefTypeId: z.number().int().positive().optional(),
  actId: z.number().int().positive().optional(),
  responseId: z.number().int().positive().optional(),
  description: z.string().optional(),
  objectIds: z.array(z.number().int().positive()).optional(),
  issueCodes: z.array(z.number().int().positive()).optional(),
  media: mediaUploadSchema.optional(),
});

// ============================================================================
// Location Schemas
// ============================================================================

export const createLocationSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  locationLevelId: z.number().int().positive().optional(),
  parentLocationId: z.number().int().positive().optional(),
  address: z.string().optional(),
  media: z.array(mediaUploadSchema).optional(),
});

export const updateLocationSchema = z.object({
  id: z.number().int().positive(),
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  locationLevelId: z.number().int().positive().optional(),
  parentLocationId: z.number().int().positive().optional(),
  address: z.string().optional(),
  media: z.array(mediaUploadSchema).optional(),
});

// ============================================================================
// Event Schemas
// ============================================================================

export const createEventSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.string().optional(),
});

export const updateEventSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.string().optional(),
});

// ============================================================================
// Issue Schemas
// ============================================================================

export const createIssueSchema = z.object({
  code: z.string().min(1, "Code is required"),
  label: z.string().min(1, "Label is required"),
  issueTypeId: z.number().int().positive().optional(),
  description: z.string().optional(),
});

export const updateIssueSchema = z.object({
  id: z.number().int().positive(),
  code: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  issueTypeId: z.number().int().positive().optional(),
  description: z.string().optional(),
});

// ============================================================================
// Asset Item Schemas
// ============================================================================

export const assetStatusSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const createAssetItemSchema = z.object({
  identifier: z.string().min(1, "Identifier is required"),
  assetModelId: z.number().int().positive(),
  statusId: assetStatusSchema.optional(),
  comment: z.string().optional(),
  attributes: z.array(attributeSchema).optional(),
});

export const updateAssetItemSchema = z.object({
  id: z.number().int().positive(),
  identifier: z.string().min(1).optional(),
  assetModelId: z.number().int().positive().optional(),
  statusId: assetStatusSchema.optional(),
  comment: z.string().optional(),
  attributes: z.array(attributeSchema).optional(),
});

// ============================================================================
// Asset Model Schemas
// ============================================================================

export const createAssetModelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  manufacturer: z.string().optional(),
  modelNumber: z.string().optional(),
});

export const updateAssetModelSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  manufacturer: z.string().optional(),
  modelNumber: z.string().optional(),
});

// ============================================================================
// Checklist Schemas
// ============================================================================

export const createChecklistSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  checklistType: z.number().int().positive(),
  eventName: z.string().min(1, "Event name is required"),
  locomotiveModel: z.string().min(1, "Locomotive model is required"),
  locomotiveNumber: z.string().min(1, "Locomotive number is required"),
  version: z.string().min(1, "Version is required"),
  validFrom: z.string().min(1, "Valid from date is required"),
  validTo: z.string().min(1, "Valid to date is required"),
}).refine((data) => {
  return new Date(data.validTo) >= new Date(data.validFrom);
}, {
  message: "Valid to date must be after or equal to valid from date",
  path: ["validTo"],
});

export const updateChecklistSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  checklistType: z.number().int().positive().optional(),
  eventName: z.string().min(1).optional(),
  locomotiveModel: z.string().min(1).optional(),
  locomotiveNumber: z.string().min(1).optional(),
  version: z.string().min(1).optional(),
  validFrom: z.string().min(1).optional(),
  validTo: z.string().min(1).optional(),
}).refine((data) => {
  if (data.validTo && data.validFrom) {
    return new Date(data.validTo) >= new Date(data.validFrom);
  }
  return true;
}, {
  message: "Valid to date must be after or equal to valid from date",
  path: ["validTo"],
});

// ============================================================================
// Operation Type Schemas
// ============================================================================

export const createOperationTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  code: z.string().optional(),
});

export const updateOperationTypeSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  code: z.string().optional(),
});

// ============================================================================
// Action Type Schemas
// ============================================================================

export const createActionTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  code: z.string().optional(),
});

export const updateActionTypeSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  code: z.string().optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateAction = z.infer<typeof createActionSchema>;
export type UpdateAction = z.infer<typeof updateActionSchema>;
export type CreateObject = z.infer<typeof createObjectSchema>;
export type UpdateObject = z.infer<typeof updateObjectSchema>;
export type CreateOperation = z.infer<typeof createOperationSchema>;
export type UpdateOperation = z.infer<typeof updateOperationSchema>;
export type CreateProcedure = z.infer<typeof createProcedureSchema>;
export type UpdateProcedure = z.infer<typeof updateProcedureSchema>;
export type CreateQuestion = z.infer<typeof createQuestionSchema>;
export type UpdateQuestion = z.infer<typeof updateQuestionSchema>;
export type CreateActionReference = z.infer<typeof createActionReferenceSchema>;
export type UpdateActionReference = z.infer<typeof updateActionReferenceSchema>;
export type CreateLocation = z.infer<typeof createLocationSchema>;
export type UpdateLocation = z.infer<typeof updateLocationSchema>;
export type CreateEvent = z.infer<typeof createEventSchema>;
export type UpdateEvent = z.infer<typeof updateEventSchema>;
export type CreateIssue = z.infer<typeof createIssueSchema>;
export type UpdateIssue = z.infer<typeof updateIssueSchema>;
export type CreateAssetItem = z.infer<typeof createAssetItemSchema>;
export type UpdateAssetItem = z.infer<typeof updateAssetItemSchema>;
export type CreateAssetModel = z.infer<typeof createAssetModelSchema>;
export type UpdateAssetModel = z.infer<typeof updateAssetModelSchema>;
export type CreateChecklist = z.infer<typeof createChecklistSchema>;
export type UpdateChecklist = z.infer<typeof updateChecklistSchema>;
export type CreateOperationType = z.infer<typeof createOperationTypeSchema>;
export type UpdateOperationType = z.infer<typeof updateOperationTypeSchema>;
export type CreateActionType = z.infer<typeof createActionTypeSchema>;
export type UpdateActionType = z.infer<typeof updateActionTypeSchema>;
