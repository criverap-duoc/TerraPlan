import { useState } from 'react';
import { CloudRain, CloudSun, Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/auth-context';
import { describeError } from '@/lib/api-error';

import type { CampaignDetail, CampaignStatus, TransitionCampaignPayload } from './types';
import { useCheckWeather } from './use-check-weather';
import { usePublishCampaign } from './use-publish-campaign';
import { useTransitionCampaign } from './use-transition-campaign';

interface PrimaryAction {
  label: string;
  to: CampaignStatus;
}

const PRIMARY_ACTION: Partial<Record<CampaignStatus, PrimaryAction>> = {
  draft: { label: 'Planificar', to: 'planned' },
  planned: { label: 'Confirmar', to: 'confirmed' },
  confirmed: { label: 'Marcar en terreno', to: 'in_field' },
  in_field: { label: 'Completar', to: 'completed' },
  needs_reschedule: { label: 'Volver a planificar', to: 'planned' },
};

export function CampaignActions({ campaign }: { campaign: CampaignDetail }) {
  const { user } = useAuth();
  const transition = useTransitionCampaign(campaign.id);
  const weather = useCheckWeather(campaign.id);
  const publish = usePublishCampaign(campaign.id);

  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const role = user?.role;
  const canPlan = role === 'admin' || role === 'coordinator';
  const canField = canPlan || role === 'field_technician';
  const canCancel = role === 'admin';
  const canPublish = canPlan;
  const isBusy = transition.isPending || weather.isPending || publish.isPending;

  const runTransition = (payload: TransitionCampaignPayload, successMessage: string) => {
    transition.mutate(payload, {
      onSuccess: () => toast.success(successMessage),
      onError: (error) => toast.error(describeError(error).detail),
    });
  };

  const handleWeatherCheck = () => {
    weather.mutate(undefined, {
      onSuccess: (result) => {
        if (result.allFeasible) {
          toast.success('El clima y el caudal permiten muestrear en todas las ventanas.');
          return;
        }
        toast.warning(
          result.transitioned
            ? 'La campaña pasó a "Reprogramar" por clima o caudal.'
            : 'Hay ventanas con clima o caudal desfavorable.',
        );
      },
      onError: (error) => toast.error(describeError(error).detail),
    });
  };

  const handlePublish = () => {
    publish.mutate(undefined, {
      onSuccess: (result) =>
        toast.success(`Se publicaron ${result.observationCount} observaciones a AquaMetric.`),
      onError: (error) => toast.error(describeError(error).detail),
    });
  };

  const primary = PRIMARY_ACTION[campaign.status];
  const canRunPrimary =
    primary !== undefined && (campaign.status === 'in_field' ? canField : canPlan);
  const canCheckWeather =
    canPlan && (campaign.status === 'planned' || campaign.status === 'confirmed');
  const canCancelNow = canCancel && ['draft', 'planned', 'confirmed'].includes(campaign.status);
  const canReschedule = canPlan && campaign.status === 'confirmed';
  const canPublishNow =
    canPublish && (campaign.status === 'in_field' || campaign.status === 'completed');

  if (!primary && !canCheckWeather && !canCancelNow && !canReschedule && !canPublishNow) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {primary && canRunPrimary ? (
        <Button
          disabled={isBusy}
          onClick={() =>
            runTransition({ to: primary.to }, `Campaña en estado ${primary.label.toLowerCase()}`)
          }
        >
          {primary.label}
        </Button>
      ) : null}

      {canCheckWeather ? (
        <Button variant="outline" disabled={isBusy} onClick={handleWeatherCheck}>
          <CloudSun className="size-4" aria-hidden="true" />
          Revisar clima
        </Button>
      ) : null}

      {canPublishNow ? (
        <Button variant="outline" disabled={isBusy} onClick={handlePublish}>
          <Send className="size-4" aria-hidden="true" />
          Publicar a AquaMetric
        </Button>
      ) : null}

      {canReschedule ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={isBusy}>
              <CloudRain className="size-4" aria-hidden="true" />
              Reprogramar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reprogramar por clima o caudal</AlertDialogTitle>
              <AlertDialogDescription>
                La campaña pasará a "Reprogramar" y se liberarán las reservas activas. Indica el
                motivo para la bitácora.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reschedule-reason">Motivo</Label>
              <Input
                id="reschedule-reason"
                value={rescheduleReason}
                onChange={(event) => setRescheduleReason(event.target.value)}
                placeholder="Lluvia intensa en la cuenca"
                maxLength={500}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Volver</AlertDialogCancel>
              <AlertDialogAction
                disabled={rescheduleReason.trim().length === 0}
                onClick={() =>
                  runTransition(
                    { to: 'needs_reschedule', reason: rescheduleReason.trim() },
                    'Campaña marcada para reprogramar',
                  )
                }
              >
                Reprogramar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {canCancelNow ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" disabled={isBusy}>
              <XCircle className="size-4" aria-hidden="true" />
              Cancelar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar la campaña</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción libera las reservas activas y no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cancel-reason">Motivo</Label>
              <Input
                id="cancel-reason"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="Campaña suspendida por el cliente"
                maxLength={500}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Volver</AlertDialogCancel>
              <AlertDialogAction
                disabled={cancelReason.trim().length === 0}
                onClick={() =>
                  runTransition(
                    { to: 'cancelled', reason: cancelReason.trim() },
                    'Campaña cancelada',
                  )
                }
              >
                Cancelar campaña
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
