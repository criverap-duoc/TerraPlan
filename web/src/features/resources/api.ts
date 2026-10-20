import { apiClient } from '@/lib/api-client';
import type { Paginated } from '@/lib/pagination';
import { buildQueryString } from '@/lib/query-string';

import type { Equipment, ResourceFilters, Technician, Vehicle } from './types';

export function listTechnicians(filters: ResourceFilters): Promise<Paginated<Technician>> {
  const query = buildQueryString({
    q: filters.q,
    page: filters.page,
    pageSize: filters.pageSize,
  });
  return apiClient.request<Paginated<Technician>>('GET', `/technicians${query}`);
}

export function listEquipment(filters: ResourceFilters): Promise<Paginated<Equipment>> {
  const query = buildQueryString({
    q: filters.q,
    page: filters.page,
    pageSize: filters.pageSize,
  });
  return apiClient.request<Paginated<Equipment>>('GET', `/equipment${query}`);
}

export function listVehicles(filters: ResourceFilters): Promise<Paginated<Vehicle>> {
  const query = buildQueryString({
    q: filters.q,
    page: filters.page,
    pageSize: filters.pageSize,
  });
  return apiClient.request<Paginated<Vehicle>>('GET', `/vehicles${query}`);
}
