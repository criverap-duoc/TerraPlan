import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/query-string';

import type {
  CatalogLimit,
  CatalogLimitFilters,
  CatalogMeta,
  CatalogParameter,
  CatalogRegulation,
  CatalogUnit,
} from './types';

export function getCatalogMeta(): Promise<CatalogMeta> {
  return apiClient.request<CatalogMeta>('GET', '/catalog/meta');
}

export function listCatalogParameters(): Promise<CatalogParameter[]> {
  return apiClient.request<CatalogParameter[]>('GET', '/catalog/parameters');
}

export function listCatalogUnits(): Promise<CatalogUnit[]> {
  return apiClient.request<CatalogUnit[]>('GET', '/catalog/units');
}

export function listCatalogRegulations(): Promise<CatalogRegulation[]> {
  return apiClient.request<CatalogRegulation[]>('GET', '/catalog/regulations');
}

export function listCatalogLimits(filters: CatalogLimitFilters = {}): Promise<CatalogLimit[]> {
  const query = buildQueryString({
    parameterCode: filters.parameterCode,
    regulationCode: filters.regulationCode,
    monitoringAreaCode: filters.monitoringAreaCode,
  });
  return apiClient.request<CatalogLimit[]>('GET', `/catalog/limits${query}`);
}
