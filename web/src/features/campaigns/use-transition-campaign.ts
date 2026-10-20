import { useMutation, useQueryClient } from '@tanstack/react-query';

import { transitionCampaign } from './api';
import type { TransitionCampaignPayload } from './types';

export function useTransitionCampaign(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TransitionCampaignPayload) => transitionCampaign(id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
        queryClient.invalidateQueries({ queryKey: ['campaign', id] }),
        queryClient.invalidateQueries({ queryKey: ['campaign', id, 'events'] }),
        queryClient.invalidateQueries({ queryKey: ['campaign', id, 'reservations'] }),
      ]);
    },
  });
}
