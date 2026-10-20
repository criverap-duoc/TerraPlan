import { useQuery } from '@tanstack/react-query';

import { listCatalogLimits } from './api';
import type { CatalogLimitFilters } from './types';

export function useCatalogLimits(filters: CatalogLimitFilters) {
  return useQuery({
    queryKey: ['catalog', 'limits', filters],
    queryFn: () => listCatalogLimits(filters),
    staleTime: 300_000,
  });
}
