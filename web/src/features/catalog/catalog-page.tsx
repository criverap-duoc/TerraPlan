import { useMemo, useState } from 'react';
import { FlaskConical, Ruler, SlidersHorizontal } from 'lucide-react';

import { DataTable } from '@/components/domain/data-table';
import { EmptyState } from '@/components/domain/empty-state';
import { ErrorBanner } from '@/components/domain/error-banner';
import { PageHeader } from '@/components/domain/page-header';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatNumber } from '@/lib/format';
import type { ColumnDef } from '@tanstack/react-table';

import { useCatalogLimits } from './use-catalog-limits';
import { useCatalogMeta } from './use-catalog-meta';
import { useCatalogParameters } from './use-catalog-parameters';
import { useCatalogRegulations } from './use-catalog-regulations';
import { useCatalogUnits } from './use-catalog-units';
import type { CatalogLimit, CatalogParameter, CatalogUnit } from './types';

const ALL = 'all';

const CATALOG_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  'draft-verified': 'Borrador verificado',
  validated: 'Validado',
};

function CatalogStatusBadge({ status }: { status: string }) {
  const label = CATALOG_STATUS_LABELS[status] ?? status;
  if (status === 'validated') {
    return <Badge className="bg-success-soft text-success-soft-foreground">{label}</Badge>;
  }
  return <Badge className="bg-warning-soft text-warning-soft-foreground">{label}</Badge>;
}

const parameterColumns: ColumnDef<CatalogParameter, unknown>[] = [
  {
    accessorKey: 'code',
    header: 'Código',
    cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{row.original.code}</span>,
  },
  {
    accessorKey: 'nameEs',
    header: 'Nombre',
    cell: ({ row }) => <span className="font-medium">{row.original.nameEs}</span>,
  },
  {
    accessorKey: 'category',
    header: 'Categoría',
    cell: ({ row }) => <span className="capitalize">{row.original.category}</span>,
  },
  {
    accessorKey: 'canonicalUnitCode',
    header: 'Unidad canónica',
    cell: ({ row }) => (
      <span className="font-mono text-xs tabular-nums">{row.original.canonicalUnitCode}</span>
    ),
  },
  {
    accessorKey: 'holdingTimeHours',
    header: 'Conservación',
    cell: ({ row }) =>
      row.original.holdingTimeHours === null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="font-mono text-xs tabular-nums">{row.original.holdingTimeHours} h</span>
      ),
  },
  {
    accessorKey: 'measurementType',
    header: 'Medición',
    cell: ({ row }) => (row.original.measurementType === 'in_situ' ? 'En sitio' : 'Laboratorio'),
  },
];

const unitColumns: ColumnDef<CatalogUnit, unknown>[] = [
  {
    accessorKey: 'code',
    header: 'Código',
    cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{row.original.code}</span>,
  },
  {
    accessorKey: 'nameEs',
    header: 'Nombre',
    cell: ({ row }) => <span className="font-medium">{row.original.nameEs}</span>,
  },
  {
    accessorKey: 'dimension',
    header: 'Dimensión',
    cell: ({ row }) => <span className="capitalize">{row.original.dimension}</span>,
  },
];

function LoadingBlock() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

function ParametersTab() {
  const query = useCatalogParameters();

  if (query.isPending) {
    return <LoadingBlock />;
  }
  if (query.error) {
    return <ErrorBanner error={query.error} onRetry={() => void query.refetch()} />;
  }

  const parameters = query.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-xs tabular-nums text-muted-foreground">
        {parameters.length} parámetros
      </p>
      {parameters.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="Catálogo sin parámetros"
          description="El catálogo compartido todavía no tiene parámetros cargados."
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable columns={parameterColumns} data={parameters} />
          </div>
          <ul className="space-y-2 md:hidden">
            {parameters.map((parameter) => (
              <li key={parameter.code} className="rounded-lg border bg-card p-3 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{parameter.nameEs}</p>
                    <p className="font-mono text-xs tabular-nums text-muted-foreground">
                      {parameter.code} · {parameter.canonicalUnitCode}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {parameter.category}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {parameter.measurementType === 'in_situ' ? 'En sitio' : 'Laboratorio'}
                  {parameter.holdingTimeHours === null
                    ? ' · Sin tiempo de conservación'
                    : ` · Conservación ${parameter.holdingTimeHours} h`}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function UnitsTab() {
  const query = useCatalogUnits();

  if (query.isPending) {
    return <LoadingBlock />;
  }
  if (query.error) {
    return <ErrorBanner error={query.error} onRetry={() => void query.refetch()} />;
  }

  const units = query.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-xs tabular-nums text-muted-foreground">
        {units.length} unidades
      </p>
      {units.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="Catálogo sin unidades"
          description="El catálogo compartido todavía no tiene unidades cargadas."
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable columns={unitColumns} data={units} />
          </div>
          <ul className="space-y-2 md:hidden">
            {units.map((unit) => (
              <li key={unit.code} className="rounded-lg border bg-card p-3 shadow-card">
                <p className="text-sm font-medium">{unit.nameEs}</p>
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  {unit.code} · {unit.dimension}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
function LimitsTab() {
  const [parameterCode, setParameterCode] = useState(ALL);
  const [regulationCode, setRegulationCode] = useState(ALL);
  const [monitoringAreaCode, setMonitoringAreaCode] = useState(ALL);

  const parametersQuery = useCatalogParameters();
  const regulationsQuery = useCatalogRegulations();
  const limitsQuery = useCatalogLimits({
    parameterCode: parameterCode === ALL ? undefined : parameterCode,
    regulationCode: regulationCode === ALL ? undefined : regulationCode,
    monitoringAreaCode: monitoringAreaCode === ALL ? undefined : monitoringAreaCode,
  });

  const parameters = parametersQuery.data ?? [];
  const regulations = regulationsQuery.data ?? [];
  const limits = limitsQuery.data ?? [];

  const columns = useMemo<ColumnDef<CatalogLimit, unknown>[]>(() => {
    const decimals = new Map(parameters.map((parameter) => [parameter.code, parameter.decimals]));
    const formatValue = (code: string, value: number | null) =>
      value === null ? '—' : formatNumber(value, decimals.get(code) ?? 2);

    return [
      {
        accessorKey: 'parameterCode',
        header: 'Parámetro',
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums">{row.original.parameterCode}</span>
        ),
      },
      {
        accessorKey: 'regulationCode',
        header: 'Regulación',
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums">{row.original.regulationCode}</span>
        ),
      },
      {
        accessorKey: 'monitoringAreaCode',
        header: 'Área',
        cell: ({ row }) => row.original.monitoringAreaCode ?? '—',
      },
      {
        accessorKey: 'qualityLevel',
        header: 'Nivel',
        cell: ({ row }) => row.original.qualityLevel ?? '—',
      },
      {
        accessorKey: 'min',
        header: 'Mín',
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums">
            {formatValue(row.original.parameterCode, row.original.min)}
          </span>
        ),
      },
      {
        accessorKey: 'max',
        header: 'Máx',
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums">
            {formatValue(row.original.parameterCode, row.original.max)}
          </span>
        ),
      },
      {
        accessorKey: 'unitCode',
        header: 'Unidad',
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums">{row.original.unitCode}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => <CatalogStatusBadge status={row.original.status} />,
      },
    ];
  }, [parameters]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="limit-parameter">Parámetro</Label>
          <Select value={parameterCode} onValueChange={setParameterCode}>
            <SelectTrigger id="limit-parameter" className="w-full">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {parameters.map((parameter) => (
                <SelectItem key={parameter.code} value={parameter.code}>
                  {parameter.code} · {parameter.nameEs}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="limit-regulation">Regulación</Label>
          <Select value={regulationCode} onValueChange={setRegulationCode}>
            <SelectTrigger id="limit-regulation" className="w-full">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              {regulations.map((regulation) => (
                <SelectItem key={regulation.code} value={regulation.code}>
                  {regulation.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="limit-area">Área de monitoreo</Label>
          <Select value={monitoringAreaCode} onValueChange={setMonitoringAreaCode}>
            <SelectTrigger id="limit-area" className="w-full">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              {regulations
                .flatMap((regulation) => regulation.monitoringAreas)
                .map((area) => (
                  <SelectItem key={area.code} value={area.code}>
                    {area.code} · {area.description}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {limitsQuery.error ? (
        <ErrorBanner error={limitsQuery.error} onRetry={() => void limitsQuery.refetch()} />
      ) : null}

      <p className="font-mono text-xs tabular-nums text-muted-foreground">
        {limits.length} límites
      </p>

      {limitsQuery.isPending ? (
        <LoadingBlock />
      ) : limits.length === 0 ? (
        <EmptyState
          icon={SlidersHorizontal}
          title="Sin límites para este filtro"
          description="Probá con otro parámetro, regulación o área de monitoreo."
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable columns={columns} data={limits} />
          </div>
          <ul className="space-y-2 md:hidden">
            {limits.map((limit, index) => (
              <li
                key={`${limit.parameterCode}-${limit.regulationCode}-${limit.monitoringAreaCode ?? 'na'}-${index}`}
                className="rounded-lg border bg-card p-3 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium tabular-nums">
                      {limit.parameterCode}
                    </p>
                    <p className="font-mono text-xs tabular-nums text-muted-foreground">
                      {limit.regulationCode}
                      {limit.monitoringAreaCode ? ` · ${limit.monitoringAreaCode}` : ''}
                    </p>
                  </div>
                  <CatalogStatusBadge status={limit.status} />
                </div>
                <p className="mt-2 font-mono text-sm tabular-nums">
                  {limit.min === null ? '—' : formatNumber(limit.min, 2)} –{' '}
                  {limit.max === null ? '—' : formatNumber(limit.max, 2)} {limit.unitCode}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function CatalogPage() {
  const metaQuery = useCatalogMeta();
  const meta = metaQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Catálogo"
        description="Parámetros, unidades y límites normativos compartidos con AquaMetric."
        actions={
          meta ? (
            <Badge
              className="bg-info-soft text-info-soft-foreground"
              aria-label="Versión del catálogo"
            >
              Versión {meta.version} · {CATALOG_STATUS_LABELS[meta.status] ?? meta.status}
            </Badge>
          ) : null
        }
      />

      <Tabs defaultValue="parameters" className="gap-4">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="parameters">Parámetros</TabsTrigger>
          <TabsTrigger value="units">Unidades</TabsTrigger>
          <TabsTrigger value="limits">Límites</TabsTrigger>
        </TabsList>

        <TabsContent value="parameters">
          <ParametersTab />
        </TabsContent>
        <TabsContent value="units">
          <UnitsTab />
        </TabsContent>
        <TabsContent value="limits">
          <LimitsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
