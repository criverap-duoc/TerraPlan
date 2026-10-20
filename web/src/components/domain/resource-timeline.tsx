import type { KeyboardEvent } from 'react';

import { formatDateTime } from '@/lib/format';

export type TimelineResourceType = 'technician' | 'equipment' | 'vehicle';

export interface TimelineResource {
  id: string;
  code: string;
  name: string;
  type: TimelineResourceType;
}

export interface TimelineBooking {
  resourceId: string;
  startsAt: Date;
  endsAt: Date;
  label: string;
}

interface ResourceTimelineProps {
  resources: TimelineResource[];
  bookings: TimelineBooking[];
  range: { from: Date; to: Date };
}

const TYPE_LABELS: Record<TimelineResourceType, string> = {
  technician: 'Técnicos',
  equipment: 'Equipos',
  vehicle: 'Vehículos',
};

const TYPE_ORDER: TimelineResourceType[] = ['technician', 'equipment', 'vehicle'];

function position(booking: TimelineBooking, range: { from: Date; to: Date }) {
  const span = range.to.getTime() - range.from.getTime();
  if (span <= 0) {
    return { left: 0, width: 100 };
  }
  const rawLeft = ((booking.startsAt.getTime() - range.from.getTime()) / span) * 100;
  const rawWidth = ((booking.endsAt.getTime() - booking.startsAt.getTime()) / span) * 100;
  const left = Math.min(Math.max(rawLeft, 0), 100);
  const width = Math.min(Math.max(rawWidth, 2), 100 - left);
  return { left, width };
}

function handleArrowKeys(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
    return;
  }
  const container = event.currentTarget.closest('[data-timeline]');
  const blocks = Array.from(
    container?.querySelectorAll<HTMLButtonElement>('[data-timeline-block]') ?? [],
  );
  const index = blocks.indexOf(event.currentTarget);
  const next = blocks[index + (event.key === 'ArrowRight' ? 1 : -1)];
  if (next) {
    event.preventDefault();
    next.focus();
  }
}

export function ResourceTimeline({ resources, bookings, range }: ResourceTimelineProps) {
  const byResource = new Map<string, TimelineBooking[]>();
  for (const booking of bookings) {
    const list = byResource.get(booking.resourceId) ?? [];
    list.push(booking);
    byResource.set(booking.resourceId, list);
  }

  const groups = TYPE_ORDER.map((type) => ({
    type,
    items: resources
      .filter((resource) => resource.type === type)
      .sort((a, b) => a.code.localeCompare(b.code)),
  })).filter((group) => group.items.length > 0);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div data-timeline>
      <div className="space-y-6 md:hidden">
        {groups.map((group) => (
          <section key={group.type} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{TYPE_LABELS[group.type]}</h3>
            {group.items.map((resource) => {
              const items = (byResource.get(resource.id) ?? []).sort(
                (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
              );
              return (
                <div key={resource.id} className="rounded-lg border bg-card p-3 shadow-card">
                  <p className="text-sm font-medium">{resource.name}</p>
                  <p className="font-mono text-xs tabular-nums text-muted-foreground">
                    {resource.code}
                  </p>
                  {items.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">Sin reservas en el rango</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {items.map((booking, index) => (
                        <li
                          key={`${resource.id}-${booking.startsAt.toISOString()}-${index}`}
                          className="rounded-md border-l-4 border-primary bg-primary/10 px-3 py-2"
                        >
                          <p className="text-sm font-medium">{booking.label}</p>
                          <p className="font-mono text-xs tabular-nums text-muted-foreground">
                            {formatDateTime(booking.startsAt)} – {formatDateTime(booking.endsAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </div>

      <div className="hidden md:block">
        <p className="mb-2 font-mono text-xs tabular-nums text-muted-foreground">
          {formatDateTime(range.from)} – {formatDateTime(range.to)}
        </p>
        <div className="overflow-hidden rounded-lg border bg-card">
          {groups.map((group) => (
            <div key={group.type}>
              <p className="border-y bg-muted px-3 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase first:border-t-0">
                {TYPE_LABELS[group.type]}
              </p>
              {group.items.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center gap-3 border-b px-3 py-2 last:border-b-0"
                >
                  <div className="w-52 shrink-0">
                    <p className="truncate text-sm font-medium">{resource.name}</p>
                    <p className="font-mono text-xs tabular-nums text-muted-foreground">
                      {resource.code}
                    </p>
                  </div>
                  <div className="relative h-8 flex-1 rounded-md bg-muted/60">
                    {(byResource.get(resource.id) ?? []).map((booking, index) => {
                      const { left, width } = position(booking, range);
                      return (
                        <button
                          key={`${resource.id}-${booking.startsAt.toISOString()}-${index}`}
                          type="button"
                          data-timeline-block
                          onKeyDown={handleArrowKeys}
                          title={`${booking.label} · ${formatDateTime(booking.startsAt)} – ${formatDateTime(booking.endsAt)}`}
                          className="absolute inset-y-1 flex items-center overflow-hidden rounded-sm border-l-4 border-primary bg-primary/15 px-2 text-left text-xs font-medium text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          style={{ left: `${left}%`, width: `${width}%` }}
                        >
                          <span className="truncate">{booking.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
