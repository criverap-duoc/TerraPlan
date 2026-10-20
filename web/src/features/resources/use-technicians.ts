import { useQuery } from '@tanstack/react-query';

import { listTechnicians } from './api';
import type { ResourceFilters } from './types';

export function useTechnicians(filters: ResourceFilters) {
  return useQuery({
    queryKey: ['technicians', filters],
    queryFn: () => listTechnicians(filters),
    staleTime: 30_000,
  });
}
