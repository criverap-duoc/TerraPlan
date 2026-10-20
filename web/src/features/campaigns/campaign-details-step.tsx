import { Loader2 } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';

import { ErrorBanner } from '@/components/domain/error-banner';
import { ParameterChip } from '@/components/domain/parameter-chip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type { CatalogParameter } from '@/features/catalog/types';
import type { Site } from '@/features/sites/types';

import type { NewCampaignValues } from './new-campaign-schema';

interface CampaignDetailsStepProps {
  form: UseFormReturn<NewCampaignValues>;
  sites: Site[];
  parameters: CatalogParameter[];
  isLoading: boolean;
  loadError: unknown;
  onRetryLoad: () => void;
  saveError: unknown;
  isSaving: boolean;
  isEdit: boolean;
  onSubmit: (values: NewCampaignValues) => void;
}

export function CampaignDetailsStep({
  form,
  sites,
  parameters,
  isLoading,
  loadError,
  onRetryLoad,
  saveError,
  isSaving,
  isEdit,
  onSubmit,
}: CampaignDetailsStepProps) {
  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = form;
  const siteId = watch('siteId');
  const selectedCodes = watch('parameterCodes');
  const parametersByCode = new Map(parameters.map((parameter) => [parameter.code, parameter]));

  const toggleParameter = (code: string) => {
    const next = selectedCodes.includes(code)
      ? selectedCodes.filter((selected) => selected !== code)
      : [...selectedCodes, code];
    setValue('parameterCodes', next, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
    >
      {loadError ? <ErrorBanner error={loadError} onRetry={onRetryLoad} /> : null}
      {saveError ? <ErrorBanner error={saveError} /> : null}

      {isEdit ? (
        <p className="rounded-lg bg-info-soft p-3 text-sm text-info-soft-foreground">
          La campaña ya está creada. Si cambiás estos datos, se actualizan al continuar.
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="campaign-code">Código de la campaña</Label>
        <Input
          id="campaign-code"
          placeholder="CAMP-2026-0013"
          autoComplete="off"
          className="font-mono uppercase tabular-nums"
          aria-invalid={Boolean(errors.code)}
          aria-describedby={errors.code ? 'campaign-code-error' : 'campaign-code-hint'}
          {...register('code')}
        />
        {errors.code ? (
          <p id="campaign-code-error" className="text-sm text-destructive-soft-foreground">
            {errors.code.message}
          </p>
        ) : (
          <p id="campaign-code-hint" className="text-xs text-muted-foreground">
            Mayúsculas, números y guiones. Debe ser único.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="campaign-site">Sitio de muestreo</Label>
        {isLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select
            value={siteId}
            onValueChange={(value) =>
              setValue('siteId', value, { shouldValidate: true, shouldDirty: true })
            }
          >
            <SelectTrigger id="campaign-site" className="w-full">
              <SelectValue placeholder="Elegí un sitio activo" />
            </SelectTrigger>
            <SelectContent>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.code} · {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {errors.siteId ? (
          <p className="text-sm text-destructive-soft-foreground">{errors.siteId.message}</p>
        ) : null}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Parámetros a medir</legend>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-lg border bg-card">
            <ul className="divide-y">
              {parameters.map((parameter) => (
                <li key={parameter.code}>
                  <label className="flex cursor-pointer items-start gap-3 p-3 hover:bg-accent">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 rounded border-input accent-primary"
                      checked={selectedCodes.includes(parameter.code)}
                      onChange={() => toggleParameter(parameter.code)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-2">
                        <span className="font-mono text-sm font-medium tabular-nums">
                          {parameter.code}
                        </span>
                        <span className="text-sm">{parameter.nameEs}</span>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {parameter.canonicalUnitCode}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {parameter.holdingTimeHours === null
                          ? 'Medición en terreno'
                          : `Conservación: ${parameter.holdingTimeHours} h`}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
        {errors.parameterCodes ? (
          <p className="text-sm text-destructive-soft-foreground">
            {errors.parameterCodes.message}
          </p>
        ) : null}

        {selectedCodes.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {selectedCodes.map((code) => (
              <ParameterChip
                key={code}
                code={code}
                name={parametersByCode.get(code)?.nameEs ?? code}
                unitCode={parametersByCode.get(code)?.canonicalUnitCode}
              />
            ))}
          </div>
        ) : null}
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="campaign-notes">Notas (opcional)</Label>
        <Textarea
          id="campaign-notes"
          placeholder="Acceso al sitio, contacto en terreno, condiciones especiales…"
          maxLength={1000}
          {...register('notes')}
        />
        {errors.notes ? (
          <p className="text-sm text-destructive-soft-foreground">{errors.notes.message}</p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving} aria-busy={isSaving}>
          {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {isSaving ? 'Guardando…' : 'Siguiente'}
        </Button>
      </div>
    </form>
  );
}
