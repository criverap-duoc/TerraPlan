import { apiClient } from '@/lib/api-client';

import type { BookingRow } from './types';

export function listCampaignReservations(campaignId: string): Promise<BookingRow[]> {
  return apiClient.request<BookingRow[]>('GET', `/campaigns/${campaignId}/reservations`);
}
