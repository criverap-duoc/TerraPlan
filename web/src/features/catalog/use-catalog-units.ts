import { useQuery } from '@tanstack/react-query';

import { listCatalogUnits } from './api';

export function useCatalogUnits() {
  return useQuery({
    queryKey: ['catalog', 'units'],
    queryFn: listCatalogUnits,
    staleTime: 300_000,
  });
}
