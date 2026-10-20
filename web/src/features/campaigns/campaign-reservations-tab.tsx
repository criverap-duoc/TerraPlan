import { CalendarX2 } from 'lucide-react';

import {
  ResourceTimeline,
  type TimelineBooking,
  type TimelineResource,
} from '@/components/domain/resource-timeline';
import { EmptyState } from '@/components/domain/empty-state';
import { ErrorBanner } from '@/components/domain/error-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { useEquipment } from '@/features/resources/use-equipment';
import { useTechnicians } from '@/features/resources/use-technicians';
import { useVehicles } from '@/features/resources/use-vehicles';
import { parseBookingRange } from '@/features/reservations/range';
import { useCampaignReservations } from '@/features/reservations/use-campaign-reservations';

import type { CampaignDetail } from './types';

const PAGE_SIZE = 100;

export function CampaignReservationsTab({ campaign }: { campaign: CampaignDetail }) {
  const reservationsQuery = useCampaignReservations(campaign.id);
  const techniciansQuery = useTechnicians({ page: 1, pageSize: PAGE_SIZE });
  const equipmentQuery = useEquipment({ page: 1, pageSize: PAGE_SIZE });
  const vehiclesQuery = useVehicles({ page: 1, pageSize: PAGE_SIZE });

  const isPending =
    reservationsQuery.isPending ||
    techniciansQuery.isPending ||
    equipmentQuery.isPending ||
    vehiclesQuery.isPending;

  const error =
    reservationsQuery.error ??
    techniciansQuery.error ??
    equipmentQuery.error ??
    vehiclesQuery.error;

  if (isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBanner
        error={error}
        onRetry={() => {
          void reservationsQuery.refetch();
          void techniciansQuery.refetch();
          void equipmentQuery.refetch();
          void vehiclesQuery.refetch();
        }}
      />
    );
  }

  const reservations = reservationsQuery.data ?? [];
  if (reservations.length === 0) {
    return (
      <EmptyState
        icon={CalendarX2}
        title="No hay reservas"
        description="Esta campaña todavía no tiene técnico, equipo y vehículo reservados."
      />
    );
  }

  const resourceById = new Map<string, TimelineResource>();
  for (const technician of techniciansQuery.data?.data ?? []) {
    resourceById.set(technician.id, {
      id: technician.id,
      code: technician.code,
      name: technician.fullName,
      type: 'technician',
    });
  }
  for (const equipment of equipmentQuery.data?.data ?? []) {
    resourceById.set(equipment.id, {
      id: equipment.id,
      code: equipment.code,
      name: equipment.name,
      type: 'equipment',
    });
  }
  for (const vehicle of vehiclesQuery.data?.data ?? []) {
    resourceById.set(vehicle.id, {
      id: vehicle.id,
      code: vehicle.code,
      name: vehicle.name,
      type: 'vehicle',
    });
  }

  const bookings: TimelineBooking[] = [];
  const resources: TimelineResource[] = [];
  const seenResources = new Set<string>();

  for (const reservation of reservations) {
    const range = parseBookingRange(reservation.during);
    if (!range) {
      continue;
    }
    bookings.push({
      resourceId: reservation.resourceId,
      startsAt: range.startsAt,
      endsAt: range.endsAt,
      label: campaign.code,
    });

    if (!seenResources.has(reservation.resourceId)) {
      seenResources.add(reservation.resourceId);
      resources.push(
        resourceById.get(reservation.resourceId) ?? {
          id: reservation.resourceId,
          code: reservation.resourceId.slice(0, 8),
          name: 'Recurso sin ficha',
          type: reservation.resourceType,
        },
      );
    }
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={CalendarX2}
        title="No hay reservas con horario válido"
        description="No pudimos interpretar el rango de las reservas registradas."
      />
    );
  }

  const starts = bookings.map((booking) => booking.startsAt.getTime());
  const ends = bookings.map((booking) => booking.endsAt.getTime());
  const from = new Date(Math.min(...starts) - 30 * 60_000);
  const to = new Date(Math.max(...ends) + 30 * 60_000);

  return <ResourceTimeline resources={resources} bookings={bookings} range={{ from, to }} />;
}
