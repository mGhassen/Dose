import { apiRequest } from './api';

export interface Unit {
  id: number;
  name: string;
  symbol: string;
  dimension: string;
  baseUnitId: number | null;
  factorToBase: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUnitData {
  name: string;
  symbol: string;
  dimension?: string;
  baseUnitId?: number | null;
  factorToBase?: number;
}

export interface UpdateUnitData extends Partial<CreateUnitData> {}

export async function getUnits(params?: { dimension?: string }): Promise<Unit[]> {
  const search = params?.dimension ? `?dimension=${encodeURIComponent(params.dimension)}` : '';
  return apiRequest<Unit[]>('GET', `/api/units${search}`);
}

export async function getUnitById(id: number): Promise<Unit> {
  return apiRequest<Unit>('GET', `/api/units/${id}`);
}

export async function createUnit(data: CreateUnitData): Promise<Unit> {
  return apiRequest<Unit>('POST', '/api/units', data);
}

export async function updateUnit(id: number, data: UpdateUnitData): Promise<Unit> {
  return apiRequest<Unit>('PATCH', `/api/units/${id}`, data);
}

export async function deleteUnit(id: number): Promise<void> {
  return apiRequest<void>('DELETE', `/api/units/${id}`);
}
