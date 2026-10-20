import { CheckCircle2, CloudRain, CloudSun, Loader2, RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type {
  CampaignStatus,
  WeatherAssessment,
  WeatherBlockReason,
} from '@/features/campaigns/types';
import { formatDateTimeWithWeekday, formatNumber } from '@/lib/format';

interface WeatherGateProps {
  assessment: WeatherAssessment | null;
  campaignStatus: CampaignStatus;
  onCheck: () => void;
  onReprogram: () => void;
  isChecking: boolean;
}

const REASON_LABELS: Record<WeatherBlockReason, string> = {
  precipitation_exceeded: 'La precipitación supera el umbral permitido',
  flow_too_low: 'El caudal está bajo el mínimo operativo',
  flow_too_high: 'El caudal supera el máximo operativo',
};

export function WeatherGate({
  assessment,
  campaignStatus,
  onCheck,
  onReprogram,
  isChecking,
}: WeatherGateProps) {
  const checkButton = (
    <Button type="button" variant="outline" size="sm" onClick={onCheck} disabled={isChecking}>
      {isChecking ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <CloudSun className="size-4" aria-hidden="true" />
      )}
      {isChecking ? 'Verificando…' : 'Verificar clima'}
    </Button>
  );

  if (assessment === null) {
    return (
      <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-card">
        <div className="flex items-start gap-3">
          <CloudSun className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <h3 className="text-base font-semibold">Clima y caudal</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Aún no se ha verificado el clima para la ventana de esta campaña.
            </p>
          </div>
        </div>
        <div className="sm:pl-8">{checkButton}</div>
      </section>
    );
  }

  const details = (
    <dl className="grid gap-2 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-xs text-muted-foreground">Ventana evaluada</dt>
        <dd className="font-mono text-xs tabular-nums">
          {formatDateTimeWithWeekday(assessment.windowStart)}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Precipitación</dt>
        <dd className="font-mono text-xs tabular-nums">
          {formatNumber(assessment.precipitationMmH, 2)} mm/h
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Caudal</dt>
        <dd className="font-mono text-xs tabular-nums">
          {formatNumber(assessment.flowM3s, 2)} m³/s
        </dd>
      </div>
    </dl>
  );

  if (assessment.isFeasible) {
    return (
      <section
        aria-live="polite"
        className="flex flex-col gap-3 rounded-lg border border-success-soft-foreground/20 bg-success-soft p-4 text-success-soft-foreground shadow-card"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="text-base font-semibold">Clima y caudal dentro de umbral</h3>
            <p className="mt-0.5 text-sm">La ventana seleccionada se puede muestrear.</p>
          </div>
        </div>
        {details}
        <div className="flex flex-wrap gap-2">{checkButton}</div>
      </section>
    );
  }

  return (
    <section
      aria-live="polite"
      className="flex flex-col gap-3 rounded-lg border border-warning-soft-foreground/20 bg-warning-soft p-4 text-warning-soft-foreground shadow-card"
    >
      <div className="flex items-start gap-3">
        <CloudRain className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <h3 className="text-base font-semibold">Clima adverso</h3>
          <p className="mt-0.5 text-sm">
            {assessment.reason
              ? REASON_LABELS[assessment.reason]
              : 'La ventana no cumple los umbrales.'}
          </p>
        </div>
      </div>
      {details}
      <div className="flex flex-wrap gap-2">
        {campaignStatus === 'confirmed' ? (
          <Button type="button" size="sm" onClick={onReprogram}>
            <RotateCw className="size-4" aria-hidden="true" />
            Reprogramar
          </Button>
        ) : null}
        {checkButton}
      </div>
    </section>
  );
}
