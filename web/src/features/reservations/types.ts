export type ReservationResourceType = 'technician' | 'equipment' | 'vehicle';

export interface BookingItem {
  id: string;
  resourceType: ReservationResourceType;
  resourceId: string;
  during: string;
}

export interface BookingResponse {
  campaignId: string;
  bookings: BookingItem[];
  status: string;
  createdAt: string;
}

export interface CreateBookingPayload {
  technicianId: string;
  equipmentId: string;
  vehicleId: string;
  startsAt: string;
  endsAt: string;
}

export interface BookingRow {
  id: string;
  campaignId: string;
  resourceType: ReservationResourceType;
  resourceId: string;
  during: string;
  status: 'active' | 'released';
  createdAt: string;
}

export interface BookingRowsResponse {
  data: BookingRow[];
}
