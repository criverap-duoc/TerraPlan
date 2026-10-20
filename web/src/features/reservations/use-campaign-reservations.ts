import { useQuery } from '@tanstack/react-query';

import { listCampaignReservations } from './api';

export function useCampaignReservations(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign', campaignId, 'reservations'],
    queryFn: () => listCampaignReservations(campaignId as string),
    enabled: Boolean(campaignId),
    staleTime: 15_000,
  });
}
