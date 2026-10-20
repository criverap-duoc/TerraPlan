import { useQuery } from '@tanstack/react-query';

import { listCampaigns } from './api';
import type { CampaignFilters } from './types';

export function useCampaigns(filters: CampaignFilters) {
  return useQuery({
    queryKey: ['campaigns', filters],
    queryFn: () => listCampaigns(filters),
    staleTime: 30_000,
  });
}
