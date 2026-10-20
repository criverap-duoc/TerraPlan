import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createBooking } from './api';
import type { CreateBookingPayload } from './types';

export function useCreateBooking(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBookingPayload) => createBooking(campaignId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] }),
        queryClient.invalidateQueries({ queryKey: ['campaign', campaignId, 'reservations'] }),
        queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
        queryClient.invalidateQueries({ queryKey: ['technicians'] }),
        queryClient.invalidateQueries({ queryKey: ['equipment'] }),
        queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
      ]);
    },
  });
}
