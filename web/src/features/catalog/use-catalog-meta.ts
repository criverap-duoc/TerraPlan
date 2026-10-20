import { useQuery } from '@tanstack/react-query';

import { getCatalogMeta } from './api';

export function useCatalogMeta() {
  return useQuery({
    queryKey: ['catalog', 'meta'],
    queryFn: getCatalogMeta,
    staleTime: 300_000,
  });
}
