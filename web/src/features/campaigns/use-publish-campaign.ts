import { useMutation, useQueryClient } from '@tanstack/react-query';

import { publishCampaign } from './api';

export function usePublishCampaign(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => publishCampaign(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['campaign', id, 'events'] });
    },
  });
}
