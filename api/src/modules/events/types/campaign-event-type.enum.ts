export enum CampaignEventType {
  Created = 'created',
  StatusChanged = 'status_changed',
  BookingCreated = 'booking_created',
  BookingReleased = 'booking_released',
  WeatherBlocked = 'weather_blocked',
  Rescheduled = 'rescheduled',
  ObservationsPublished = 'observations_published',
  Cancelled = 'cancelled',
}

export const CAMPAIGN_EVENT_TYPES: CampaignEventType[] = Object.values(CampaignEventType);
