import { cn } from 'cn';
import { CircleCheck, CircleSlash } from 'lucide-react';

import { HoldingTimeMeter } from '@/components/domain/holding-time-meter';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formatDateTimeWithWeekday, formatTime } from '@/lib/format';

export interface WindowOption {
  id: string;
  startsAt: string;
  endsAt: string;
  holdingDeadline: string | null;
  isFeasible: boolean;
  infeasibilityReason?: string | null;
}

interface WindowPickerProps {
  windows: WindowOption[];
  selectedWindowId?: string;
  onSelect?: (windowId: string) => void;
  mode: 'selectable' | 'readonly';
  /** Full conservation time of the selected parameters, used as the meter reference. */
  totalHours?: number;
}

const REASON_LABELS: Record<string, string> = {
  holding_exceeded:
    'la muestra no alcanza a llegar al laboratorio dentro del tiempo de conservación',
  lab_closed: 'el laboratorio está cerrado cuando llega la muestra',
};

function feasibilityLabel(window: WindowOption): string {
  if (window.isFeasible) {
    return 'Factible';
  }
  const reason = window.infeasibilityReason ? REASON_LABELS[window.infeasibilityReason] : undefined;
  return reason ? `No factible: ${reason}` : 'No factible';
}

function WindowCard({ window, totalHours }: { window: WindowOption; totalHours?: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-medium tabular-nums">
            {formatDateTimeWithWeekday(window.startsAt)}
          </p>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            hasta {formatTime(window.endsAt)}
          </p>
        </div>
        <Badge
          className={cn(
            window.isFeasible
              ? 'bg-success-soft text-success-soft-foreground'
              : 'bg-destructive-soft text-destructive-soft-foreground',
          )}
        >
          {window.isFeasible ? (
            <CircleCheck className="size-3" aria-hidden="true" />
          ) : (
            <CircleSlash className="size-3" aria-hidden="true" />
          )}
          {window.isFeasible ? 'Factible' : 'No factible'}
        </Badge>
      </div>

      {!window.isFeasible ? (
        <p className="text-xs text-muted-foreground">{feasibilityLabel(window)}</p>
      ) : null}

      <HoldingTimeMeter deadline={window.holdingDeadline} totalHours={totalHours} />
    </div>
  );
}

export function WindowPicker({
  windows,
  selectedWindowId,
  onSelect,
  mode,
  totalHours,
}: WindowPickerProps) {
  if (windows.length === 0) {
    return null;
  }

  if (mode === 'readonly') {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {windows.map((window) => (
          <div
            key={window.id}
            className={cn(
              'rounded-lg border bg-card p-4 shadow-card',
              !window.isFeasible && 'opacity-60',
              window.id === selectedWindowId && 'border-primary',
            )}
          >
            {window.id === selectedWindowId ? (
              <Badge className="mb-2 bg-accent text-accent-foreground">Ventana seleccionada</Badge>
            ) : null}
            <WindowCard window={window} totalHours={totalHours} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <RadioGroup
      value={selectedWindowId}
      onValueChange={onSelect}
      className="grid gap-3 md:grid-cols-2"
      aria-label="Ventanas factibles"
    >
      {windows.map((window) => {
        const isSelected = window.id === selectedWindowId;
        const inputId = `window-${window.id}`;

        return (
          <label
            key={window.id}
            htmlFor={inputId}
            className={cn(
              'flex cursor-pointer flex-col gap-3 rounded-lg border bg-card p-4 shadow-card transition-colors',
              'hover:border-primary/60 focus-within:ring-2 focus-within:ring-ring',
              !window.isFeasible && 'cursor-not-allowed opacity-60 hover:border-border',
              isSelected && 'border-primary ring-1 ring-primary',
            )}
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem
                id={inputId}
                value={window.id}
                disabled={!window.isFeasible}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <WindowCard window={window} totalHours={totalHours} />
              </div>
            </div>
          </label>
        );
      })}
    </RadioGroup>
  );
}
