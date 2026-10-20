import { apiClient } from '@/lib/api-client';
import type { Paginated } from '@/lib/pagination';
import { buildQueryString } from '@/lib/query-string';

import type {
  Campaign,
  CampaignDetail,
  CampaignEventsResponse,
  CampaignFilters,
  FeasibleWindowsResponse,
  PersistedWindowInput,
  PublishCampaignResponse,
  TransitionCampaignPayload,
  WeatherCheckResponse,
} from './types';

export interface CampaignDetailsPayload {
  code: string;
  siteId: string;
  parameterCodes: string[];
  notes?: string;
  earliestStart?: string;
}

export interface FeasibleWindowsPayload {
  earliestStart: string;
  latestEnd: string;
  slotMinutes: number;
  transportMinutes: number;
  parameterCodes?: string[];
}

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

export function createCampaign(payload: CampaignDetailsPayload): Promise<Campaign> {
  return apiClient.request<Campaign>('POST', '/campaigns', payload);
}

// Only draft campaigns accept a PATCH; the wizard updates the campaign it just created.
export function updateCampaign(id: string, payload: CampaignDetailsPayload): Promise<Campaign> {
  return apiClient.request<Campaign>('PATCH', `/campaigns/${id}`, payload);
}

export function computeFeasibleWindows(
  id: string,
  payload: FeasibleWindowsPayload,
): Promise<FeasibleWindowsResponse> {
  return apiClient.request<FeasibleWindowsResponse>(
    'POST',
    `/campaigns/${id}/feasible-windows`,
    payload,
  );
}

export function persistWindows(
  id: string,
  windows: PersistedWindowInput[],
): Promise<CampaignDetail> {
  return apiClient.request<CampaignDetail>('POST', `/campaigns/${id}/windows`, { windows });
}

export function selectWindow(id: string, windowId: string): Promise<CampaignDetail> {
  return apiClient.request<CampaignDetail>('POST', `/campaigns/${id}/select-window`, { windowId });
}
