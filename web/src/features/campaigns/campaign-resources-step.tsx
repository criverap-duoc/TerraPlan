import { Loader2 } from 'lucide-react';

import { ConflictBanner } from '@/components/domain/conflict-banner';
import { ErrorBanner } from '@/components/domain/error-banner';
import { HoldingTimeMeter } from '@/components/domain/holding-time-meter';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { CampaignWindow } from '@/features/campaigns/types';
import type { Equipment, Technician, Vehicle } from '@/features/resources/types';
import { formatDateTimeWithWeekday, formatTime } from '@/lib/format';
import type { ProblemDetail } from '@/lib/problem-detail';

export interface ResourceSelection {
  technicianId: string;
  equipmentId: string;
  vehicleId: string;
}

interface CampaignResourcesStepProps {
  window: CampaignWindow;
  totalHours?: number;
  technicians: Technician[];
  equipment: Equipment[];
  vehicles: Vehicle[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  selection: ResourceSelection;
  onSelectionChange: (next: ResourceSelection) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  conflict: ProblemDetail | null;
  onSeeAlternatives: () => void;
  onRetryBooking: () => void;
  onBack: () => void;
}

export function CampaignResourcesStep({
  window,
  totalHours,
  technicians,
  equipment,
  vehicles,
  isLoading,
  error,
  onRetry,
  selection,
  onSelectionChange,
  onSubmit,
  isSubmitting,
  conflict,
  onSeeAlternatives,
  onRetryBooking,
  onBack,
}: CampaignResourcesStepProps) {
  const hasSelection =
    selection.technicianId !== '' && selection.equipmentId !== '' && selection.vehicleId !== '';

  const renderSelect = (
    id: string,
    label: string,
    placeholder: string,
    value: string,
    onChange: (value: string) => void,
    options: { id: string; label: string; hint: string }[],
  ) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {isLoading ? (
        <Skeleton className="h-9 w-full" />
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label} · {option.hint}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {error ? <ErrorBanner error={error} onRetry={onRetry} /> : null}
      {conflict ? (
        <ConflictBanner
          problem={conflict}
          onSeeAlternatives={onSeeAlternatives}
          onRetry={onRetryBooking}
        />
      ) : null}

      <div className="rounded-lg border bg-card p-4 shadow-card">
        <p className="text-sm font-medium">Ventana seleccionada</p>
        <p className="mt-1 font-mono text-sm tabular-nums">
          {formatDateTimeWithWeekday(window.startsAt)} – {formatTime(window.endsAt)}
        </p>
        <div className="mt-3">
          <HoldingTimeMeter deadline={window.holdingDeadline} totalHours={totalHours} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {renderSelect(
          'campaign-technician',
          'Técnico',
          'Elegí un técnico',
          selection.technicianId,
          (technicianId) => onSelectionChange({ ...selection, technicianId }),
          technicians.map((technician) => ({
            id: technician.id,
            label: technician.fullName,
            hint: technician.code,
          })),
        )}
        {renderSelect(
          'campaign-equipment',
          'Equipo',
          'Elegí un equipo',
          selection.equipmentId,
          (equipmentId) => onSelectionChange({ ...selection, equipmentId }),
          equipment.map((item) => ({ id: item.id, label: item.name, hint: item.code })),
        )}
        {renderSelect(
          'campaign-vehicle',
          'Vehículo',
          'Elegí un vehículo',
          selection.vehicleId,
          (vehicleId) => onSelectionChange({ ...selection, vehicleId }),
          vehicles.map((vehicle) => ({
            id: vehicle.id,
            label: vehicle.name,
            hint: vehicle.code || vehicle.plate,
          })),
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Los tres recursos se reservan en una sola operación. Si alguno ya está tomado en esta
        ventana, no se reserva ninguno.
      </p>

      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting}>
          Volver
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!hasSelection || isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {isSubmitting ? 'Reservando…' : 'Reservar y confirmar'}
        </Button>
      </div>
    </div>
  );
}
