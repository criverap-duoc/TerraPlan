export type ReservationResourceType = 'technician' | 'equipment' | 'vehicle';

export interface BookingRow {
  id: string;
  campaignId: string;
  resourceType: ReservationResourceType;
  resourceId: string;
  during: string;
  status: 'active' | 'released';
  createdAt: string;
}
