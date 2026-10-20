import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/query-string';

import type {
  BookingResponse,
  BookingRow,
  BookingRowsResponse,
  CreateBookingPayload,
} from './types';

export function listCampaignReservations(campaignId: string): Promise<BookingRow[]> {
  return apiClient.request<BookingRow[]>('GET', `/campaigns/${campaignId}/reservations`);
}

export function listReservationsByRange(from: string, to: string): Promise<BookingRowsResponse> {
  const query = buildQueryString({ from, to });
  return apiClient.request<BookingRowsResponse>('GET', `/reservations${query}`);
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
