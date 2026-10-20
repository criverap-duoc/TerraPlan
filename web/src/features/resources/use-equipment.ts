import { useQuery } from '@tanstack/react-query';

import { listEquipment } from './api';
import type { ResourceFilters } from './types';

export function useEquipment(filters: ResourceFilters) {
  return useQuery({
    queryKey: ['equipment', filters],
    queryFn: () => listEquipment(filters),
    staleTime: 30_000,
  });
}
