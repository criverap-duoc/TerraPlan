import { apiClient } from '@/lib/api-client';
import type { Paginated } from '@/lib/pagination';
import { buildQueryString } from '@/lib/query-string';

import type {
  Campaign,
  CampaignDetail,
  CampaignEventsResponse,
  CampaignFilters,
  PublishCampaignResponse,
  TransitionCampaignPayload,
  WeatherCheckResponse,
} from './types';

export function listCampaigns(filters: CampaignFilters): Promise<Paginated<Campaign>> {
  const query = buildQueryString({
    status: filters.status,
    siteId: filters.siteId,
    from: filters.from,
    to: filters.to,
    page: filters.page,
    pageSize: filters.pageSize,
  });
  return apiClient.request<Paginated<Campaign>>('GET', `/campaigns${query}`);
}

export function getCampaign(id: string): Promise<CampaignDetail> {
  return apiClient.request<CampaignDetail>('GET', `/campaigns/${id}`);
}

export function transitionCampaign(
  id: string,
  payload: TransitionCampaignPayload,
): Promise<Campaign> {
  return apiClient.request<Campaign>('POST', `/campaigns/${id}/transition`, payload);
}

export function checkWeather(id: string): Promise<WeatherCheckResponse> {
  return apiClient.request<WeatherCheckResponse>('POST', `/campaigns/${id}/check-weather`);
}

export function publishCampaign(id: string): Promise<PublishCampaignResponse> {
  return apiClient.request<PublishCampaignResponse>('POST', `/campaigns/${id}/publish`);
}

export function listCampaignEvents(id: string): Promise<CampaignEventsResponse> {
  return apiClient.request<CampaignEventsResponse>('GET', `/campaigns/${id}/events?limit=50`);
}
