import { apiClient } from '@/lib/api-client';
import type { Paginated } from '@/lib/pagination';
import { buildQueryString } from '@/lib/query-string';

import type { Site } from './types';

interface ListSitesParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

export function listSites(params: ListSitesParams = {}): Promise<Paginated<Site>> {
  const query = buildQueryString({
    q: params.q,
    page: params.page,
    pageSize: params.pageSize ?? 100,
  });
  return apiClient.request<Paginated<Site>>('GET', `/sites${query}`);
}
