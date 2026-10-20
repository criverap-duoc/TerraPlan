import {
  CalendarClock,
  CalendarMinus,
  CalendarPlus,
  CloudRain,
  FilePlus2,
  History,
  RefreshCw,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import type { ComponentType } from 'react';

import { EmptyState } from '@/components/domain/empty-state';
import { ErrorBanner } from '@/components/domain/error-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, formatRelative } from '@/lib/format';

import { EVENT_TITLES, summarizePayload } from './campaign-event-copy';
import type { CampaignDetail, CampaignEventType } from './types';
import { useCampaignEvents } from './use-campaign-events';

const EVENT_ICONS: Record<CampaignEventType, ComponentType<{ className?: string }>> = {
  created: FilePlus2,
  status_changed: RefreshCw,
  booking_created: CalendarPlus,
  booking_released: CalendarMinus,
  weather_blocked: CloudRain,
  rescheduled: CalendarClock,
  observations_published: UploadCloud,
  cancelled: XCircle,
};

export function CampaignEventsTab({ campaign }: { campaign: CampaignDetail }) {
  const query = useCampaignEvents(campaign.id);

  if (query.isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (query.error) {
    return <ErrorBanner error={query.error} onRetry={() => void query.refetch()} />;
  }

  const events = query.data?.data ?? [];
  if (events.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No hay eventos registrados"
        description="Las acciones sobre la campaña se registran acá para auditoría."
      />
    );
  }

  return (
    <ol className="relative space-y-4 border-l pl-5">
      {events.map((event) => {
        const Icon = EVENT_ICONS[event.type] ?? RefreshCw;
        const summary = summarizePayload(event.payload);

        return (
          <li key={event.id} className="relative">
            <span className="absolute top-0 -left-[2.05rem] flex size-6 items-center justify-center rounded-full border bg-card text-muted-foreground">
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium">{EVENT_TITLES[event.type] ?? event.type}</p>
            {summary ? (
              <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                {summary}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              {formatRelative(event.at)} ·{' '}
              <span className="font-mono tabular-nums">{formatDateTime(event.at)}</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
