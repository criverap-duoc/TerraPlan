import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createCampaign, updateCampaign } from './api';
import type { CampaignDetailsPayload } from './api';

interface SaveCampaignInput {
  campaignId: string | null;
  values: CampaignDetailsPayload;
}

export function useSaveCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, values }: SaveCampaignInput) =>
      campaignId ? updateCampaign(campaignId, values) : createCampaign(values),
    onSuccess: async (campaign) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
        queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] }),
      ]);
    },
  });
}
