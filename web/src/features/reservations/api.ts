import { apiClient } from '@/lib/api-client';

import type { BookingResponse, BookingRow, CreateBookingPayload } from './types';

export function listCampaignReservations(campaignId: string): Promise<BookingRow[]> {
  return apiClient.request<BookingRow[]>('GET', `/campaigns/${campaignId}/reservations`);
}

export function createBooking(
  campaignId: string,
  payload: CreateBookingPayload,
): Promise<BookingResponse> {
  return apiClient.request<BookingResponse>(
    'POST',
    `/campaigns/${campaignId}/reservations`,
    payload,
  );
}
