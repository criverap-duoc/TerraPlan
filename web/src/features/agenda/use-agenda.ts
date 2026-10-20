import { useQueries } from '@tanstack/react-query';

import { getCampaign } from '@/features/campaigns/api';
import type { Campaign, CampaignWindow } from '@/features/campaigns/types';
import { listCampaignReservations } from '@/features/reservations/api';
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
 * There is no cross-campaign bookings endpoint yet, so the agenda reads the reservations of every
 * campaign in parallel. With the MVP data set (<= 100 campaigns) this stays within a few requests.
 */
export function useAgendaBookings(campaigns: Campaign[]) {
  return useQueries({
    queries: campaigns.map((campaign) => ({
      queryKey: ['campaign', campaign.id, 'reservations'],
      queryFn: () => listCampaignReservations(campaign.id),
      staleTime: 15_000,
    })),
    combine: (results) => {
      const bookings: AgendaBooking[] = [];

      results.forEach((result, index) => {
        const campaign = campaigns[index];
        if (!campaign) {
          return;
        }
        for (const row of result.data ?? []) {
          const range = parseBookingRange(row.during);
          if (!range) {
            continue;
          }
          bookings.push({
            row,
            campaignCode: campaign.code,
            startsAt: range.startsAt,
            endsAt: range.endsAt,
          });
        }
      });

      return {
        isPending: results.some((result) => result.isPending),
        error: results.find((result) => result.error)?.error ?? null,
        bookings,
      };
    },
  });
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
