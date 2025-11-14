// Object types

export interface AttributeDTO {
  key: string;
  value: string;
}

export interface ObjectLocalizationDTO {
  id: number;
  name: string | null;
  code: string | null;
  description: string | null;
  levels: string[] | null;
}

export interface MediaDTO {
  id: number;
  fileName: string | null;
  contentType: string | null;
  url: string | null;
  createdAt: string;
}

export interface Object {
  id: number;
  code: string | null;
  name: string | null;
  description: string | null;
  localizations: Array<ObjectLocalizationDTO> | null;
  media: MediaDTO | null;
  attributes: Array<AttributeDTO> | null;
  createdAt: string;
  updatedAt: string | null;
  isDeletable: boolean;
  // Enriched fields for backwards compatibility
  locations?: string[];
  locationCodes?: string[];
}

export interface CreateObjectData {
  code: string;
  name: string;
  description?: string;
  localizations?: Array<{ id: number }>;
  mediaId?: number;
  attributes?: Array<AttributeDTO>;
}

export interface UpdateObjectData {
  id: number;
  code?: string;
  name?: string;
  description?: string;
  localizations?: Array<{ id: number }>;
  mediaId?: number;
  attributes?: Array<AttributeDTO>;
}

