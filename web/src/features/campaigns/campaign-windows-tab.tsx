import { CalendarClock, TriangleAlert } from 'lucide-react';

import { DataTable } from '@/components/domain/data-table';
import { EmptyState } from '@/components/domain/empty-state';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/format';
import type { ColumnDef } from '@tanstack/react-table';

import type { CampaignDetail, CampaignWindow } from './types';

function arrivalAt(window: CampaignWindow): Date {
  return new Date(new Date(window.endsAt).getTime() + window.transportMinutes * 60_000);
}

function isFeasible(window: CampaignWindow): boolean {
  if (window.holdingDeadline === null) {
    return true;
  }
  return arrivalAt(window).getTime() <= new Date(window.holdingDeadline).getTime();
}

const columns: ColumnDef<CampaignWindow, unknown>[] = [
  {
    id: 'sampling',
    header: 'Muestreo',
    cell: ({ row }) => (
      <span className="font-mono text-xs tabular-nums">
        {formatDateTime(row.original.startsAt)} – {formatDateTime(row.original.endsAt)}
      </span>
    ),
  },
  {
    id: 'arrival',
    header: 'Llegada al laboratorio',
    cell: ({ row }) => (
      <span className="font-mono text-xs tabular-nums">
        {formatDateTime(arrivalAt(row.original))}
      </span>
    ),
  },
  {
    id: 'holdingDeadline',
    header: 'Límite de conservación',
    cell: ({ row }) =>
      row.original.holdingDeadline ? (
        <span className="font-mono text-xs tabular-nums">
          {formatDateTime(row.original.holdingDeadline)}
        </span>
      ) : (
        <span className="text-muted-foreground">Sin límite</span>
      ),
  },
  {
    id: 'feasible',
    header: 'Factible',
    cell: ({ row }) =>
      isFeasible(row.original) ? (
        <Badge className="bg-success-soft text-success-soft-foreground">Sí</Badge>
      ) : (
        <Badge className="bg-destructive-soft text-destructive-soft-foreground">No</Badge>
      ),
  },
  {
    id: 'selected',
    header: 'Selección',
    cell: ({ row }) =>
      row.original.isSelected ? (
        <Badge className="bg-accent text-accent-foreground">Seleccionada</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export function CampaignWindowsTab({ campaign }: { campaign: CampaignDetail }) {
  if (campaign.windows.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No hay ventanas para esta campaña"
        description="Calculá ventanas factibles desde el asistente de planificación para verlas acá."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {campaign.windows.some((window) => !isFeasible(window)) ? (
        <p className="flex items-start gap-2 rounded-lg bg-warning-soft p-3 text-sm text-warning-soft-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Hay ventanas donde la muestra no alcanza a llegar al laboratorio dentro del tiempo de
          conservación.
        </p>
      ) : null}

      <div className="hidden md:block">
        <DataTable columns={columns} data={campaign.windows} />
      </div>

      <ul className="space-y-2 md:hidden">
        {campaign.windows.map((window) => (
          <li key={window.id} className="rounded-lg border bg-card p-3 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <p className="font-mono text-xs tabular-nums">
                {formatDateTime(window.startsAt)} – {formatDateTime(window.endsAt)}
              </p>
              {isFeasible(window) ? (
                <Badge className="bg-success-soft text-success-soft-foreground">Factible</Badge>
              ) : (
                <Badge className="bg-destructive-soft text-destructive-soft-foreground">
                  No factible
                </Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Llegada al laboratorio:{' '}
              <span className="font-mono tabular-nums">{formatDateTime(arrivalAt(window))}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Límite de conservación:{' '}
              <span className="font-mono tabular-nums">
                {window.holdingDeadline ? formatDateTime(window.holdingDeadline) : 'sin límite'}
              </span>
            </p>
            {window.isSelected ? (
              <Badge className="mt-2 bg-accent text-accent-foreground">Seleccionada</Badge>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
