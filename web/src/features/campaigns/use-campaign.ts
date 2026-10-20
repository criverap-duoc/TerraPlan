import { useQuery } from '@tanstack/react-query';

import { getCampaign } from './api';

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: () => getCampaign(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}
