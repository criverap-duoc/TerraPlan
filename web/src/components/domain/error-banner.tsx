import { AlertTriangle, Lock, RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { describeError } from '@/lib/api-error';

interface ErrorBannerProps {
  error: unknown;
  onRetry?: () => void;
}

export function ErrorBanner({ error, onRetry }: ErrorBannerProps) {
  const { title, detail, requestId, isForbidden } = describeError(error);
  const Icon = isForbidden ? Lock : AlertTriangle;

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-lg border border-destructive-soft-foreground/20 bg-destructive-soft p-4 text-destructive-soft-foreground sm:flex-row sm:items-start"
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-sm">{detail}</p>
        {requestId ? (
          <p className="mt-1 font-mono text-xs tabular-nums opacity-80">Solicitud {requestId}</p>
        ) : null}
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="sm:ml-auto">
          <RotateCw className="size-4" aria-hidden="true" />
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
