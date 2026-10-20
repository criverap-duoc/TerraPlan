import { useMutation, useQueryClient } from '@tanstack/react-query';

import { checkWeather } from './api';

export function useCheckWeather(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => checkWeather(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['campaign', id] }),
        queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
        queryClient.invalidateQueries({ queryKey: ['campaign', id, 'events'] }),
      ]);
    },
  });
}
