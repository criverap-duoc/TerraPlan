import type { Site } from '@/features/sites/types';

export type CampaignStatus =
  'draft' | 'planned' | 'confirmed' | 'in_field' | 'completed' | 'needs_reschedule' | 'cancelled';

export const CAMPAIGN_STATUSES: CampaignStatus[] = [
  'draft',
  'planned',
  'confirmed',
  'in_field',
  'completed',
  'needs_reschedule',
  'cancelled',
];

export interface Campaign {
  id: string;
  code: string;
  status: CampaignStatus;
  siteId: string | null;
  earliestStart: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignWindow {
  id: string;
  startsAt: string;
  endsAt: string;
  transportMinutes: number;
  holdingDeadline: string | null;
  isSelected: boolean;
}

export interface CampaignDetail extends Campaign {
  site: Site | null;
  parameters: string[];
  windows: CampaignWindow[];
  hasActiveReservations: boolean;
}

export interface CampaignFilters {
  status?: CampaignStatus;
  siteId?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export type CampaignEventType =
  | 'created'
  | 'status_changed'
  | 'booking_created'
  | 'booking_released'
  | 'weather_blocked'
  | 'rescheduled'
  | 'observations_published'
  | 'cancelled';

export interface CampaignEvent {
  id: string;
  campaignId: string;
  type: CampaignEventType;
  payload: Record<string, unknown>;
  actorId: string | null;
  requestId: string;
  at: string;
}

export interface CampaignEventsResponse {
  data: CampaignEvent[];
  meta: { count: number; nextCursor: string | null };
}

export type WeatherBlockReason = 'precipitation_exceeded' | 'flow_too_low' | 'flow_too_high';

export interface WeatherAssessment {
  windowId: string | null;
  windowStart: string;
  windowEnd: string;
  isFeasible: boolean;
  precipitationMmH: number;
  flowM3s: number;
  reason: WeatherBlockReason | null;
}

export interface WeatherCheckResponse {
  campaignId: string;
  allFeasible: boolean;
  transitioned: boolean;
  assessments: WeatherAssessment[];
}

export interface PublishCampaignResponse {
  campaignId: string;
  published: boolean;
  catalogVersion: string;
  idempotencyKey: string;
  observationCount: number;
  siteCode: string;
}

export interface TransitionCampaignPayload {
  to: CampaignStatus;
  reason?: string;
}

export interface FeasibleWindow {
  samplingStart: string;
  samplingEnd: string;
  arrivalAtLab: string;
  analysisStart: string;
  holdingDeadline: string | null;
  isFeasible: boolean;
  infeasibilityReason?: 'lab_closed' | 'holding_exceeded';
}

export interface FeasibleWindowsResponse {
  campaignId: string;
  minHoldingTimeHours: number | 'Infinity';
  windows: FeasibleWindow[];
}

export interface PersistedWindowInput {
  startsAt: string;
  endsAt: string;
  transportMinutes: number;
  holdingDeadline: string | null;
}
