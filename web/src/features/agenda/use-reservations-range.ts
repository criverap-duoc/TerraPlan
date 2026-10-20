import { useQuery } from '@tanstack/react-query';

import { listReservationsByRange } from '@/features/reservations/api';

/** Reads every active booking that overlaps the visible agenda range in a single request. */
export function useReservationsRange(range: { from: Date; to: Date }) {
  const from = range.from.toISOString();
  const to = range.to.toISOString();

  return useQuery({
    queryKey: ['reservations', 'range', from, to],
    queryFn: () => listReservationsByRange(from, to),
    staleTime: 15_000,
  });
}
