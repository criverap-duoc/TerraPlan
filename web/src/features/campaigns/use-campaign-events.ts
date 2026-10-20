import { useQuery } from '@tanstack/react-query';

import { listCampaignEvents } from './api';

export function useCampaignEvents(id: string | undefined) {
  return useQuery({
    queryKey: ['campaign', id, 'events'],
    queryFn: () => listCampaignEvents(id as string),
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}
