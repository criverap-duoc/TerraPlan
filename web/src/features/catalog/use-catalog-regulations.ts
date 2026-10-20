import { useQuery } from '@tanstack/react-query';

import { listCatalogRegulations } from './api';

export function useCatalogRegulations() {
  return useQuery({
    queryKey: ['catalog', 'regulations'],
    queryFn: listCatalogRegulations,
    staleTime: 300_000,
  });
}
