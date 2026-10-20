import { useMemo, useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/domain/empty-state';
import { ErrorBanner } from '@/components/domain/error-banner';
import { PageHeader } from '@/components/domain/page-header';
import {
  ResourceTimeline,
  type TimelineBooking,
  type TimelineResource,
} from '@/components/domain/resource-timeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCampaigns } from '@/features/campaigns/use-campaigns';
import { useEquipment } from '@/features/resources/use-equipment';
import { useTechnicians } from '@/features/resources/use-technicians';
import { useVehicles } from '@/features/resources/use-vehicles';
import { formatDateTime, formatDate } from '@/lib/format';

import { useAgendaBookings, useInFieldCampaigns } from './use-agenda';

type RangeMode = 'today' | 'week' | 'next7';

const PAGE_SIZE = 100;

const RANGE_LABELS: Record<RangeMode, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  next7: 'Próximos 7 días',
};

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function rangeFor(mode: RangeMode, offset: number): { from: Date; to: Date } {
  const today = startOfDay(new Date());

  if (mode === 'today') {
    const from = new Date(today);
    from.setDate(from.getDate() + offset);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    return { from, to };
  }

  if (mode === 'week') {
    const from = new Date(today);
    const weekday = (from.getDay() + 6) % 7; // Monday = 0
    from.setDate(from.getDate() - weekday + offset * 7);
    const to = new Date(from);
    to.setDate(to.getDate() + 7);
    return { from, to };
  }

  const from = new Date(today);
  from.setDate(from.getDate() + offset * 7);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  return { from, to };
}

export function AgendaPage() {
  const [mode, setMode] = useState<RangeMode>('today');
  const [offset, setOffset] = useState(0);

  const range = useMemo(() => rangeFor(mode, offset), [mode, offset]);
  const todayRange = useMemo(() => rangeFor('today', 0), []);

  const campaignsQuery = useCampaigns({ page: 1, pageSize: PAGE_SIZE });
  const pendingQuery = useCampaigns({ status: 'needs_reschedule', page: 1, pageSize: 1 });
  const techniciansQuery = useTechnicians({ page: 1, pageSize: PAGE_SIZE });
  const equipmentQuery = useEquipment({ page: 1, pageSize: PAGE_SIZE });
  const vehiclesQuery = useVehicles({ page: 1, pageSize: PAGE_SIZE });

  const campaigns = campaignsQuery.data?.data ?? [];
  const agenda = useAgendaBookings(campaigns);
  const inField = useInFieldCampaigns(campaigns, todayRange);

  const resources: TimelineResource[] = useMemo(() => {
    const technicians = (techniciansQuery.data?.data ?? []).map((technician) => ({
      id: technician.id,
      code: technician.code,
      name: technician.fullName,
      type: 'technician' as const,
    }));
    const equipment = (equipmentQuery.data?.data ?? []).map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      type: 'equipment' as const,
    }));
    const vehicles = (vehiclesQuery.data?.data ?? []).map((vehicle) => ({
      id: vehicle.id,
      code: vehicle.code,
      name: vehicle.name,
      type: 'vehicle' as const,
    }));

    return [...technicians, ...equipment, ...vehicles];
  }, [techniciansQuery.data, equipmentQuery.data, vehiclesQuery.data]);

  const bookings: TimelineBooking[] = agenda.bookings
    .filter(
      (booking) =>
        booking.endsAt.getTime() > range.from.getTime() &&
        booking.startsAt.getTime() < range.to.getTime(),
    )
    .map((booking) => ({
      resourceId: booking.row.resourceId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      label: booking.campaignCode,
    }));

  const isPending =
    campaignsQuery.isPending ||
    techniciansQuery.isPending ||
    equipmentQuery.isPending ||
    vehiclesQuery.isPending ||
    agenda.isPending;

  const error =
    campaignsQuery.error ??
    techniciansQuery.error ??
    equipmentQuery.error ??
    vehiclesQuery.error ??
    agenda.error;

  const retry = () => {
    void campaignsQuery.refetch();
    void techniciansQuery.refetch();
    void equipmentQuery.refetch();
    void vehiclesQuery.refetch();
  };

  const pendingTotal = pendingQuery.data?.meta.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Agenda"
        description="Disponibilidad de técnicos, equipos y vehículos, y campañas del día."
        actions={
          <Button asChild>
            <Link to="/campaigns/new">
              <Plus className="size-4" aria-hidden="true" />
              Nueva campaña
            </Link>
          </Button>
        }
      />

      {pendingTotal > 0 ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-lg bg-warning-soft p-4 text-warning-soft-foreground sm:flex-row sm:items-center"
        >
          <CalendarClock className="size-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">
            {pendingTotal === 1
              ? '1 campaña espera reprogramación'
              : `${pendingTotal} campañas esperan reprogramación`}
          </p>
          <Button asChild variant="outline" size="sm" className="sm:ml-auto">
            <Link to="/campaigns?status=needs_reschedule">Ver</Link>
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={mode}
          onValueChange={(value) => {
            setMode(value as RangeMode);
            setOffset(0);
          }}
        >
          <TabsList aria-label="Rango de la agenda">
            {(Object.keys(RANGE_LABELS) as RangeMode[]).map((key) => (
              <TabsTrigger key={key} value={key}>
                {RANGE_LABELS[key]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Rango anterior"
            onClick={() => setOffset((current) => current - 1)}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <span className="font-mono text-sm tabular-nums" aria-live="polite">
            {formatDate(range.from)} – {formatDate(range.to)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Rango siguiente"
            onClick={() => setOffset((current) => current + 1)}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {error ? <ErrorBanner error={error} onRetry={retry} /> : null}

      {isPending ? (
        <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="flex flex-col gap-3 lg:col-span-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="flex flex-col gap-3 lg:col-span-2">
            {resources.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Sin recursos registrados"
                description="Cargá técnicos, equipos y vehículos para ver la disponibilidad en la agenda."
                action={
                  <Button asChild variant="outline">
                    <Link to="/resources">Ver recursos</Link>
                  </Button>
                }
              />
            ) : (
              <>
                {bookings.length === 0 ? (
                  <p className="rounded-lg bg-info-soft p-3 text-sm text-info-soft-foreground">
                    No hay reservas activas en este rango. Los recursos están libres.
                  </p>
                ) : null}
                <ResourceTimeline resources={resources} bookings={bookings} range={range} />
              </>
            )}
          </div>

          <Card className="h-fit shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Hoy en terreno</CardTitle>
            </CardHeader>
            <CardContent>
              {inField.isPending ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : inField.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay campañas marcadas en terreno hoy.
                </p>
              ) : (
                <ul className="space-y-3">
                  {inField.items.map(({ campaign, window }) => (
                    <li key={campaign.id}>
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="font-mono text-sm font-medium tabular-nums underline-offset-4 hover:underline"
                      >
                        {campaign.code}
                      </Link>
                      <p className="font-mono text-xs tabular-nums text-muted-foreground">
                        {formatDateTime(window.startsAt)} – {formatDateTime(window.endsAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
