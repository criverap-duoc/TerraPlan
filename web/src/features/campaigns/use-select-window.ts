import { useMutation, useQueryClient } from '@tanstack/react-query';

import { selectWindow } from './api';

export function useSelectWindow(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (windowId: string) => selectWindow(campaignId, windowId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] }),
        queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
      ]);
    },
  });
}
