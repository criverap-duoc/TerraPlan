import { useQuery } from '@tanstack/react-query';

import { listVehicles } from './api';
import type { ResourceFilters } from './types';

export function useVehicles(filters: ResourceFilters) {
  return useQuery({
    queryKey: ['vehicles', filters],
    queryFn: () => listVehicles(filters),
    staleTime: 30_000,
  });
}
