import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  CampaignStatusBadge,
  campaignStatusLabel,
} from '@/components/domain/campaign-status-badge';
import { DataTable } from '@/components/domain/data-table';
import { EmptyState } from '@/components/domain/empty-state';
import { ErrorBanner } from '@/components/domain/error-banner';
import { PageHeader } from '@/components/domain/page-header';
import { PaginationBar } from '@/components/domain/pagination-bar';
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useSites } from '@/features/sites/use-sites';
import { formatDate, formatDateTime } from '@/lib/format';
import type { ColumnDef } from '@tanstack/react-table';

import { CAMPAIGN_STATUSES } from './types';
import type { Campaign, CampaignStatus } from './types';
import { useCampaigns } from './use-campaigns';

const PAGE_SIZE = 25;
const ALL = 'all';

interface FiltersState {
  status: string;
  siteId: string;
  from: string;
  to: string;
}

const INITIAL_FILTERS: FiltersState = { status: ALL, siteId: ALL, from: '', to: '' };

function CampaignFilters({
  value,
  onChange,
  sites,
}: {
  value: FiltersState;
  onChange: (next: FiltersState) => void;
  sites: { id: string; code: string; name: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-status">Estado</Label>
        <Select value={value.status} onValueChange={(status) => onChange({ ...value, status })}>
          <SelectTrigger id="filter-status" className="w-full">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {CAMPAIGN_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {campaignStatusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-site">Sitio</Label>
        <Select value={value.siteId} onValueChange={(siteId) => onChange({ ...value, siteId })}>
          <SelectTrigger id="filter-site" className="w-full">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {sites.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.code} · {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-from">Desde</Label>
        <Input
          id="filter-from"
          type="date"
          value={value.from}
          onChange={(event) => onChange({ ...value, from: event.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-to">Hasta</Label>
        <Input
          id="filter-to"
          type="date"
          value={value.to}
          onChange={(event) => onChange({ ...value, to: event.target.value })}
        />
      </div>
    </div>
  );
}

function buildColumns(siteNames: Map<string, string>): ColumnDef<Campaign, unknown>[] {
  return [
    {
      accessorKey: 'code',
      header: 'Código',
      cell: ({ row }) => (
        <Link
          to={`/campaigns/${row.original.id}`}
          className="font-mono text-xs font-medium tabular-nums text-primary underline-offset-4 hover:underline"
        >
          {row.original.code}
        </Link>
      ),
    },
    {
      accessorKey: 'siteId',
      header: 'Sitio',
      cell: ({ row }) => {
        const siteId = row.original.siteId;
        const label = siteId ? (siteNames.get(siteId) ?? '—') : '—';
        return <span className="text-sm">{label}</span>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => <CampaignStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'earliestStart',
      header: 'Inicio estimado',
      cell: ({ row }) =>
        row.original.earliestStart ? (
          <span className="font-mono text-xs tabular-nums">
            {formatDateTime(row.original.earliestStart)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Creada',
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums">{formatDate(row.original.createdAt)}</span>
      ),
    },
  ];
}

export function CampaignsPage() {
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const sitesQuery = useSites();
  const query = useCampaigns({
    status: filters.status === ALL ? undefined : (filters.status as CampaignStatus),
    siteId: filters.siteId === ALL ? undefined : filters.siteId,
    from: filters.from ? `${filters.from}T00:00:00Z` : undefined,
    to: filters.to ? `${filters.to}T23:59:59Z` : undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const sites = sitesQuery.data?.data ?? [];
  const siteNames = useMemo(
    () => new Map(sites.map((site) => [site.id, `${site.code} · ${site.name}`])),
    [sites],
  );
  const columns = useMemo(() => buildColumns(siteNames), [siteNames]);

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta ?? { page, pageSize: PAGE_SIZE, total: 0 };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Campañas"
        description="Campañas de muestreo, filtrables por estado, sitio y fecha."
        actions={
          <Button asChild>
            <Link to="/campaigns/new">
              <Plus className="size-4" aria-hidden="true" />
              Nueva campaña
            </Link>
          </Button>
        }
      />

      <div className="hidden md:block">
        <CampaignFilters value={filters} onChange={setFilters} sites={sites} />
      </div>

      <div className="md:hidden">
        <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Filtros
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>Ajustá estado, sitio y rango de fechas.</SheetDescription>
            </SheetHeader>
            <div className="mt-4">
              <CampaignFilters value={filters} onChange={setFilters} sites={sites} />
            </div>
            <div className="mt-4">
              <SheetClose asChild>
                <Button className="w-full">Aplicar filtros</Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {query.error ? (
        <ErrorBanner error={query.error} onRetry={() => void query.refetch()} />
      ) : null}

      {!query.isPending && !query.error && rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No hay campañas"
          description="No hay campañas que coincidan con estos filtros. Probá ampliar el rango de fechas."
          action={
            <Button asChild variant="outline">
              <Link to="/campaigns/new">Crear la primera</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable columns={columns} data={rows} isLoading={query.isPending} />
          </div>

          <ul className="space-y-2 md:hidden">
            {query.isPending
              ? Array.from({ length: 4 }).map((_, index) => (
                  <li
                    key={`skeleton-${index}`}
                    className="h-24 animate-pulse rounded-lg border bg-card"
                  />
                ))
              : rows.map((campaign) => (
                  <li key={campaign.id} className="rounded-lg border bg-card p-3 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium tabular-nums">
                          {campaign.code}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {campaign.siteId ? (siteNames.get(campaign.siteId) ?? '—') : '—'}
                        </p>
                      </div>
                      <CampaignStatusBadge status={campaign.status} />
                    </div>
                    <p className="mt-2 font-mono text-xs tabular-nums text-muted-foreground">
                      {campaign.earliestStart
                        ? `Inicio estimado: ${formatDateTime(campaign.earliestStart)}`
                        : 'Sin fecha estimada'}
                    </p>
                    <Link
                      to={`/campaigns/${campaign.id}`}
                      className="mt-2 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Ver detalle
                    </Link>
                  </li>
                ))}
          </ul>

          <PaginationBar
            page={meta.page}
            pageSize={meta.pageSize}
            total={meta.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
