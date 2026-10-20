import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';

import { useReservationsRange } from '@/features/agenda/use-reservations-range';
import { getCampaign } from '@/features/campaigns/api';
import type { Campaign, CampaignWindow } from '@/features/campaigns/types';
import { parseBookingRange } from '@/features/reservations/range';
import type { BookingRow } from '@/features/reservations/types';

export interface AgendaBooking {
  row: BookingRow;
  campaignCode: string;
  startsAt: Date;
  endsAt: Date;
}

export interface InFieldCampaign {
  campaign: Campaign;
  window: CampaignWindow;
}

/**
 * The agenda reads every active booking overlapping the visible range in one request and resolves
 * the campaign code from the campaigns already loaded by the page.
 */
export function useAgendaBookings(campaigns: Campaign[], range: { from: Date; to: Date }) {
  const query = useReservationsRange(range);
  const campaignCodes = useMemo(
    () => new Map(campaigns.map((campaign) => [campaign.id, campaign.code])),
    [campaigns],
  );

  const bookings = useMemo(() => {
    const rows: AgendaBooking[] = [];

    for (const row of query.data?.data ?? []) {
      const bookingRange = parseBookingRange(row.during);
      if (!bookingRange) {
        continue;
      }
      rows.push({
        row,
        campaignCode: campaignCodes.get(row.campaignId) ?? row.campaignId.slice(0, 8),
        startsAt: bookingRange.startsAt,
        endsAt: bookingRange.endsAt,
      });
    }

    return rows;
  }, [query.data, campaignCodes]);

  return { isPending: query.isPending, error: query.error, bookings };
}

export function useInFieldCampaigns(campaigns: Campaign[], range: { from: Date; to: Date }) {
  const inField = campaigns.filter((campaign) => campaign.status === 'in_field');

  return useQueries({
    queries: inField.map((campaign) => ({
      queryKey: ['campaign', campaign.id],
      queryFn: () => getCampaign(campaign.id),
      staleTime: 30_000,
    })),
    combine: (results) => {
      const items: InFieldCampaign[] = [];

      results.forEach((result, index) => {
        const campaign = inField[index];
        if (!campaign || !result.data) {
          return;
        }
        const window =
          result.data.windows.find((candidate) => candidate.isSelected) ?? result.data.windows[0];
        if (!window) {
          return;
        }
        const startsAt = new Date(window.startsAt).getTime();
        const endsAt = new Date(window.endsAt).getTime();
        if (endsAt <= range.from.getTime() || startsAt >= range.to.getTime()) {
          return;
        }
        items.push({ campaign, window });
      });

      return { isPending: results.some((result) => result.isPending), items };
    },
  });
}
