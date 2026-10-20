import { AlertTriangle, ArrowRightLeft, RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ProblemDetail } from '@/lib/problem-detail';

interface ConflictBannerProps {
  problem: ProblemDetail;
  onSeeAlternatives?: () => void;
  onRetry?: () => void;
}

export function ConflictBanner({ problem, onSeeAlternatives, onRetry }: ConflictBannerProps) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-lg border border-destructive-soft-foreground/20 bg-destructive-soft p-4 text-destructive-soft-foreground"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Conflicto de reserva</p>
          <p className="mt-0.5 text-sm">{problem.detail}</p>
          {problem.requestId ? (
            <p className="mt-1 font-mono text-xs tabular-nums opacity-80">
              Solicitud {problem.requestId}
            </p>
          ) : null}
        </div>
      </div>

      {onSeeAlternatives || onRetry ? (
        <div className="flex flex-wrap gap-2 sm:pl-8">
          {onSeeAlternatives ? (
            <Button type="button" variant="outline" size="sm" onClick={onSeeAlternatives}>
              <ArrowRightLeft className="size-4" aria-hidden="true" />
              Ver alternativas
            </Button>
          ) : null}
          {onRetry ? (
            <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
              <RotateCw className="size-4" aria-hidden="true" />
              Reintentar
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
