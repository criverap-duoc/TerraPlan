import { useQuery } from '@tanstack/react-query';

import { listSites } from './api';

export const SITES_QUERY_KEY = ['sites', { pageSize: 100 }] as const;

export function useSites() {
  return useQuery({
    queryKey: SITES_QUERY_KEY,
    queryFn: () => listSites({ pageSize: 100 }),
    staleTime: 300_000,
  });
}
