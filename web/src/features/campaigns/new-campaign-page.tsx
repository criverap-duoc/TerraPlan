import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from 'cn';
import { ChevronRight, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/features/auth/auth-context';
import { useCatalogParameters } from '@/features/catalog/use-catalog-parameters';
import { useEquipment } from '@/features/resources/use-equipment';
import { useTechnicians } from '@/features/resources/use-technicians';
import { useVehicles } from '@/features/resources/use-vehicles';
import { useCreateBooking } from '@/features/reservations/use-create-booking';
import { useSites } from '@/features/sites/use-sites';
import { ApiError } from '@/lib/api-client';
import { describeError } from '@/lib/api-error';
import type { ProblemDetail } from '@/lib/problem-detail';

import { CampaignDetailsStep } from './campaign-details-step';
import { CampaignResourcesStep, type ResourceSelection } from './campaign-resources-step';
import { CampaignWindowsStep } from './campaign-windows-step';
import { newCampaignSchema, type NewCampaignValues } from './new-campaign-schema';
import type { CampaignWindow } from './types';
import { usePrepareWindows } from './use-prepare-windows';
import { useSaveCampaign } from './use-save-campaign';
import { useSelectWindow } from './use-select-window';
import { useTransitionCampaign } from './use-transition-campaign';

const PAGE_SIZE = 100;
const DAY_MS = 86_400_000;
const STEPS = ['Datos', 'Ventanas', 'Reserva'] as const;
const CANCEL_REASON = 'Cancelada desde el asistente de planificación.';

// Windows start tomorrow at 08:00 local and cover a week; the wizard shows the first feasible ones.
function buildWindowsPayload(values: NewCampaignValues) {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(8, 0, 0, 0);

  return {
    earliestStart: start.toISOString(),
    latestEnd: new Date(start.getTime() + 7 * DAY_MS).toISOString(),
    slotMinutes: 120,
    transportMinutes: 90,
    parameterCodes: values.parameterCodes,
  };
}

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm" aria-label="Pasos del asistente">
      {STEPS.map((label, index) => {
        const isDone = index < current;
        const isCurrent = index === current;

        return (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'flex size-7 items-center justify-center rounded-full border font-mono text-xs tabular-nums',
                isCurrent && 'border-primary bg-primary text-primary-foreground',
                isDone && 'border-success bg-success-soft text-success-soft-foreground',
                !isCurrent && !isDone && 'border-input text-muted-foreground',
              )}
            >
              {index + 1}
            </span>
            <span
              className={cn('font-medium', isCurrent ? 'text-foreground' : 'text-muted-foreground')}
            >
              {label}
            </span>
            {index < STEPS.length - 1 ? (
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function NewCampaignPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canPlan = user?.role === 'admin' || user?.role === 'coordinator';

  const [step, setStep] = useState(0);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [windows, setWindows] = useState<CampaignWindow[]>([]);
  const [minHoldingTimeHours, setMinHoldingTimeHours] = useState<number | 'Infinity'>('Infinity');
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);
  const [selection, setSelection] = useState<ResourceSelection>({
    technicianId: '',
    equipmentId: '',
    vehicleId: '',
  });
  const [conflict, setConflict] = useState<ProblemDetail | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const sitesQuery = useSites();
  const parametersQuery = useCatalogParameters();
  const techniciansQuery = useTechnicians({ page: 1, pageSize: PAGE_SIZE });
  const equipmentQuery = useEquipment({ page: 1, pageSize: PAGE_SIZE });
  const vehiclesQuery = useVehicles({ page: 1, pageSize: PAGE_SIZE });

  const saveCampaign = useSaveCampaign();
  const prepareWindows = usePrepareWindows();
  const selectWindowMutation = useSelectWindow(campaignId ?? '');
  const booking = useCreateBooking(campaignId ?? '');
  const transition = useTransitionCampaign(campaignId ?? '');

  const form = useForm<NewCampaignValues>({
    resolver: zodResolver(newCampaignSchema),
    defaultValues: { code: '', siteId: '', parameterCodes: [], notes: '' },
  });

  const selectedWindow = windows.find((window) => window.id === selectedWindowId) ?? null;
  const totalHours = typeof minHoldingTimeHours === 'number' ? minHoldingTimeHours : undefined;

  useEffect(() => {
    if (!canPlan) {
      navigate('/campaigns', { replace: true });
    }
  }, [canPlan, navigate]);

  const requestWindows = (id: string, values: NewCampaignValues) => {
    prepareWindows.mutate(
      { campaignId: id, payload: buildWindowsPayload(values) },
      {
        onSuccess: (prepared) => {
          setWindows(prepared.windows);
          setMinHoldingTimeHours(prepared.minHoldingTimeHours);
          setSelectedWindowId(null);
        },
      },
    );
  };

  const handleDetailsSubmit = (values: NewCampaignValues) => {
    const payload = {
      code: values.code.trim().toUpperCase(),
      siteId: values.siteId,
      parameterCodes: values.parameterCodes,
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
    };

    saveCampaign.mutate(
      { campaignId, values: payload },
      {
        onSuccess: (campaign) => {
          setCampaignId(campaign.id);
          setConflict(null);
          setStep(1);
          requestWindows(campaign.id, values);
        },
      },
    );
  };

  const handleSelectWindow = (windowId: string) => {
    selectWindowMutation.mutate(windowId, {
      onSuccess: (detail) => {
        setSelectedWindowId(detail.windows.find((window) => window.isSelected)?.id ?? windowId);
      },
      onError: (error) => toast.error(describeError(error).detail),
    });
  };

  const handleBook = () => {
    if (!campaignId || !selectedWindow) {
      return;
    }

    setConflict(null);
    booking.mutate(
      {
        ...selection,
        startsAt: selectedWindow.startsAt,
        endsAt: selectedWindow.endsAt,
      },
      {
        onSuccess: () => {
          transition.mutate(
            { to: 'planned' },
            {
              onSuccess: () => {
                toast.success('Campaña creada y planificada');
                navigate(`/campaigns/${campaignId}`);
              },
              onError: (error) => toast.error(describeError(error).detail),
            },
          );
        },
        onError: (error) => {
          const problem = error instanceof ApiError && error.status === 409 ? error.problem : null;

          if (problem) {
            setConflict(problem);
            return;
          }

          toast.error(describeError(error).detail);
        },
      },
    );
  };

  const handleCancel = () => {
    if (!campaignId) {
      navigate('/campaigns');
      return;
    }

    transition.mutate(
      { to: 'cancelled', reason: CANCEL_REASON },
      {
        onSuccess: () => {
          toast.success('Campaña cancelada');
          navigate('/campaigns');
        },
        onError: (error) => toast.error(describeError(error).detail),
      },
    );
  };

  const resourceError = techniciansQuery.error ?? equipmentQuery.error ?? vehiclesQuery.error;

  const activeTechnicians = (techniciansQuery.data?.data ?? []).filter(
    (technician) => technician.isActive,
  );
  const activeEquipment = (equipmentQuery.data?.data ?? []).filter((item) => item.isActive);
  const activeVehicles = (vehiclesQuery.data?.data ?? []).filter((vehicle) => vehicle.isActive);

  if (!canPlan) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ruta de navegación" className="flex items-center gap-1 text-sm">
        <Link
          to="/campaigns"
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Campañas
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        <span>Nueva campaña</span>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Nueva campaña</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sitio, parámetros, ventana factible y reserva de recursos.
          </p>
        </div>
        <Button variant="ghost" onClick={() => setIsCancelOpen(true)}>
          <XCircle className="size-4" aria-hidden="true" />
          Cancelar
        </Button>
      </div>

      <StepIndicator current={step} />

      <Card className="shadow-card">
        <CardContent>
          {step === 0 ? (
            <CampaignDetailsStep
              form={form}
              sites={(sitesQuery.data?.data ?? []).filter((site) => site.isActive)}
              parameters={parametersQuery.data ?? []}
              isLoading={sitesQuery.isPending || parametersQuery.isPending}
              loadError={sitesQuery.error ?? parametersQuery.error}
              onRetryLoad={() => {
                void sitesQuery.refetch();
                void parametersQuery.refetch();
              }}
              saveError={saveCampaign.error}
              isSaving={saveCampaign.isPending}
              isEdit={campaignId !== null}
              onSubmit={handleDetailsSubmit}
            />
          ) : null}

          {step === 1 ? (
            <CampaignWindowsStep
              windows={windows}
              isLoading={prepareWindows.isPending}
              error={prepareWindows.error}
              minHoldingTimeHours={minHoldingTimeHours}
              selectedWindowId={selectedWindowId}
              onSelect={handleSelectWindow}
              isSelecting={selectWindowMutation.isPending}
              onRetry={() => {
                if (campaignId) {
                  requestWindows(campaignId, form.getValues());
                }
              }}
              onBack={() => setStep(0)}
              onNext={() => setStep(2)}
            />
          ) : null}

          {step === 2 && selectedWindow ? (
            <CampaignResourcesStep
              window={selectedWindow}
              totalHours={totalHours}
              technicians={activeTechnicians}
              equipment={activeEquipment}
              vehicles={activeVehicles}
              isLoading={
                techniciansQuery.isPending || equipmentQuery.isPending || vehiclesQuery.isPending
              }
              error={resourceError}
              onRetry={() => {
                void techniciansQuery.refetch();
                void equipmentQuery.refetch();
                void vehiclesQuery.refetch();
              }}
              selection={selection}
              onSelectionChange={setSelection}
              onSubmit={handleBook}
              isSubmitting={booking.isPending || transition.isPending}
              conflict={conflict}
              onSeeAlternatives={() => {
                void techniciansQuery.refetch();
                void equipmentQuery.refetch();
                void vehiclesQuery.refetch();
                toast.info('Actualizamos la lista de recursos disponibles.');
              }}
              onRetryBooking={handleBook}
              onBack={() => setStep(1)}
            />
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar la nueva campaña</AlertDialogTitle>
            <AlertDialogDescription>
              {campaignId
                ? 'La campaña en borrador se cancelará y se liberarán sus reservas. Esta acción no se puede deshacer.'
                : 'Se descartarán los datos ingresados.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={transition.isPending}>
              {transition.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Cancelar campaña
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
