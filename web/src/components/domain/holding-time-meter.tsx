import { cn } from 'cn';
import { AlertOctagon, CheckCircle2, Info, Timer } from 'lucide-react';

import { formatDuration } from '@/lib/format';

interface HoldingTimeMeterProps {
  deadline: Date | string | null;
  /** Full conservation time of the parameter set, used as the 100% reference. */
  totalHours?: number;
  now?: Date;
  className?: string;
}

const HOUR_MS = 3_600_000;

export function HoldingTimeMeter({
  deadline,
  totalHours = 48,
  now = new Date(),
  className,
}: HoldingTimeMeterProps) {
  if (deadline === null) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground',
          className,
        )}
      >
        <Info className="size-4" aria-hidden="true" />
        Sin límite de conservación
      </div>
    );
  }

  const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
  const remainingMs = deadlineDate.getTime() - now.getTime();
  const totalMs = Math.max(totalHours, 1) * HOUR_MS;
  const progress = Math.min(Math.max(remainingMs / totalMs, 0), 1) * 100;
  const remainingMinutes = Math.abs(remainingMs) / 60_000;

  const isExpired = remainingMs <= 0;
  const isTight = !isExpired && progress <= 50;

  const tone = isExpired
    ? 'bg-destructive-soft text-destructive-soft-foreground'
    : isTight
      ? 'bg-warning-soft text-warning-soft-foreground'
      : 'bg-success-soft text-success-soft-foreground';
  const barTone = isExpired ? 'bg-destructive' : isTight ? 'bg-warning' : 'bg-success';
  const Icon = isExpired ? AlertOctagon : isTight ? Timer : CheckCircle2;
  const label = isExpired
    ? `Vencido hace ${formatDuration(remainingMinutes)}`
    : `Quedan ${formatDuration(remainingMinutes)}`;

  return (
    <div className={cn('rounded-lg border bg-card p-3', className)}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className={cn('flex size-6 items-center justify-center rounded-full', tone)}>
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        <span>{isExpired ? 'Tiempo de conservación vencido' : 'Tiempo de conservación'}</span>
        <span className="ml-auto font-mono text-sm tabular-nums">{label}</span>
      </div>
      <div
        role="progressbar"
        aria-label="Tiempo de conservación restante"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className={cn('h-full rounded-full', barTone)} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
