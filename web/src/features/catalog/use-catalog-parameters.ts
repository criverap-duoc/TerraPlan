import { useQuery } from '@tanstack/react-query';

import { listCatalogParameters } from './api';

export function useCatalogParameters() {
  return useQuery({
    queryKey: ['catalog', 'parameters'],
    queryFn: listCatalogParameters,
    staleTime: 300_000,
  });
}
