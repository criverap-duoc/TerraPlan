import { CalendarClock } from 'lucide-react';

import { EmptyState } from '@/components/domain/empty-state';
import { ErrorBanner } from '@/components/domain/error-banner';
import { WindowPicker, type WindowOption } from '@/components/domain/window-picker';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { CampaignWindow } from '@/features/campaigns/types';
import { formatDuration } from '@/lib/format';

const MINUTE_MS = 60_000;

function toOption(window: CampaignWindow): WindowOption {
  const arrivalAt = new Date(window.endsAt).getTime() + window.transportMinutes * MINUTE_MS;
  const isFeasible =
    window.holdingDeadline === null || arrivalAt <= new Date(window.holdingDeadline).getTime();

  return {
    id: window.id,
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    holdingDeadline: window.holdingDeadline,
    isFeasible,
  };
}

interface CampaignWindowsStepProps {
  windows: CampaignWindow[];
  isLoading: boolean;
  error: unknown;
  minHoldingTimeHours: number | 'Infinity';
  selectedWindowId: string | null;
  onSelect: (windowId: string) => void;
  isSelecting: boolean;
  onRetry: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function CampaignWindowsStep({
  windows,
  isLoading,
  error,
  minHoldingTimeHours,
  selectedWindowId,
  onSelect,
  isSelecting,
  onRetry,
  onBack,
  onNext,
}: CampaignWindowsStepProps) {
  const totalHours = typeof minHoldingTimeHours === 'number' ? minHoldingTimeHours : undefined;

  return (
    <div className="flex flex-col gap-5">
      {error ? <ErrorBanner error={error} onRetry={onRetry} /> : null}

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      ) : windows.length === 0 && !error ? (
        <EmptyState
          icon={CalendarClock}
          title="No hay ventanas factibles"
          description="Con estos parámetros la muestra no alcanza a llegar al laboratorio dentro del tiempo de conservación. Probá con otros parámetros o ampliá el rango."
          action={
            <Button type="button" variant="outline" onClick={onBack}>
              Volver
            </Button>
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Elegí la ventana en la que se hará el muestreo. La muestra debe llegar al laboratorio
            antes del límite de conservación
            {totalHours === undefined
              ? '.'
              : ` (${formatDuration(totalHours * 60)} para el parámetro más exigente).`}{' '}
            Mostramos hasta 8 ventanas en horario diurno.
          </p>
          <WindowPicker
            windows={windows.map(toOption)}
            selectedWindowId={selectedWindowId ?? undefined}
            onSelect={onSelect}
            mode="selectable"
            totalHours={totalHours}
          />
        </>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Volver
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={isLoading || isSelecting || selectedWindowId === null}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
