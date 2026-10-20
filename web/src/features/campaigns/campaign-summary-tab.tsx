import { CloudSun, MapPin, PackageCheck, Timer } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { HoldingTimeMeter } from '@/components/domain/holding-time-meter';
import { ParameterChip } from '@/components/domain/parameter-chip';
import { WeatherGate } from '@/components/domain/weather-gate';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCatalogParameters } from '@/features/catalog/use-catalog-parameters';
import { useCampaignReservations } from '@/features/reservations/use-campaign-reservations';
import { describeError } from '@/lib/api-error';
import { formatDateTime } from '@/lib/format';

import { summarizePayload } from './campaign-event-copy';
import type { CampaignDetail, WeatherAssessment } from './types';
import { useCampaignEvents } from './use-campaign-events';
import { useCheckWeather } from './use-check-weather';
import { useTransitionCampaign } from './use-transition-campaign';

const RESCHEDULE_REASON = 'Reprogramada por clima o caudal adverso detectado en el detalle.';

export function CampaignSummaryTab({ campaign }: { campaign: CampaignDetail }) {
  const parametersQuery = useCatalogParameters();
  const reservationsQuery = useCampaignReservations(campaign.id);
  const eventsQuery = useCampaignEvents(campaign.id);
  const checkWeather = useCheckWeather(campaign.id);
  const transition = useTransitionCampaign(campaign.id);

  const [assessment, setAssessment] = useState<WeatherAssessment | null>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  const parametersByCode = new Map(
    (parametersQuery.data ?? []).map((parameter) => [parameter.code, parameter]),
  );
  const selectedWindow = campaign.windows.find((window) => window.isSelected) ?? null;
  const maxHoldingHours = Math.max(
    0,
    ...campaign.parameters.map((code) => parametersByCode.get(code)?.holdingTimeHours ?? 0),
  );
  const lastWeatherEvent = (eventsQuery.data?.data ?? []).find(
    (event) => event.type === 'weather_blocked',
  );

  const handleCheckWeather = () => {
    checkWeather.mutate(undefined, {
      onSuccess: (result) => {
        const match =
          result.assessments.find((item) => item.windowId === selectedWindow?.id) ??
          result.assessments[0] ??
          null;
        setAssessment(match);
      },
      onError: (error) => toast.error(describeError(error).detail),
    });
  };

  const handleReschedule = () => {
    transition.mutate(
      { to: 'needs_reschedule', reason: RESCHEDULE_REASON },
      {
        onSuccess: () => {
          setIsRescheduleOpen(false);
          setAssessment(null);
          toast.success('La campaña quedó marcada para reprogramar.');
        },
        onError: (error) => toast.error(describeError(error).detail),
      },
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
            Sitio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {campaign.site ? (
            <>
              <p className="text-sm font-medium">{campaign.site.name}</p>
              <p className="font-mono text-xs tabular-nums text-muted-foreground">
                {campaign.site.code}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sin sitio asignado</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="size-4 text-muted-foreground" aria-hidden="true" />
            Tiempo de conservación
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedWindow ? (
            <div className="flex flex-col gap-3">
              <p className="font-mono text-xs tabular-nums text-muted-foreground">
                {formatDateTime(selectedWindow.startsAt)} – {formatDateTime(selectedWindow.endsAt)}
              </p>
              <HoldingTimeMeter
                deadline={selectedWindow.holdingDeadline}
                totalHours={maxHoldingHours > 0 ? maxHoldingHours : undefined}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {campaign.windows.length > 0
                ? 'Todavía no hay una ventana seleccionada para esta campaña.'
                : 'Sin ventanas calculadas para esta campaña.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Parámetros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {campaign.parameters.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin parámetros definidos</p>
          ) : (
            campaign.parameters.map((code) => (
              <ParameterChip
                key={code}
                code={code}
                name={parametersByCode.get(code)?.nameEs ?? code}
                unitCode={parametersByCode.get(code)?.canonicalUnitCode}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CloudSun className="size-4 text-muted-foreground" aria-hidden="true" />
            Última evaluación de clima
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventsQuery.isPending ? (
            <Skeleton className="h-4 w-40" />
          ) : lastWeatherEvent ? (
            <>
              <p className="text-sm font-medium">
                {formatDateTime(lastWeatherEvent.at)} · bloqueada por clima
              </p>
              <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
                {summarizePayload(lastWeatherEvent.payload) ?? 'Sin detalle registrado'}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sin evaluaciones de clima registradas.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageCheck className="size-4 text-muted-foreground" aria-hidden="true" />
            Reservas activas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reservationsQuery.isPending ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <p className="font-mono text-2xl font-semibold tabular-nums">
              {reservationsQuery.data?.length ?? 0}
            </p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            Técnico, equipo y vehículo reservados para la ventana seleccionada.
          </p>
        </CardContent>
      </Card>

      <div className="md:col-span-2">
        <WeatherGate
          assessment={assessment}
          campaignStatus={campaign.status}
          onCheck={handleCheckWeather}
          onReprogram={() => setIsRescheduleOpen(true)}
          isChecking={checkWeather.isPending}
        />
      </div>

      <AlertDialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reprogramar por clima o caudal</AlertDialogTitle>
            <AlertDialogDescription>
              La campaña pasará a &quot;Reprogramar&quot; y se liberarán las reservas activas. El
              motivo queda registrado en la bitácora.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleReschedule} disabled={transition.isPending}>
              Reprogramar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
