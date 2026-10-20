import { Search } from 'lucide-react';

import { DataTable } from '@/components/domain/data-table';
import { EmptyState } from '@/components/domain/empty-state';
import { ErrorBanner } from '@/components/domain/error-banner';
import { PaginationBar } from '@/components/domain/pagination-bar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ColumnDef } from '@tanstack/react-table';
import type { PaginationMeta } from '@/lib/pagination';

import type { ResourceRow } from './resource-rows';

function buildColumns(detailLabel: string): ColumnDef<ResourceRow, unknown>[] {
  return [
    {
      accessorKey: 'code',
      header: 'Código',
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums">{row.original.code}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'detail',
      header: detailLabel,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.detail}</span>,
    },
    {
      accessorKey: 'isActive',
      header: 'Estado',
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge className="bg-success-soft text-success-soft-foreground">Activo</Badge>
        ) : (
          <Badge className="bg-muted text-muted-foreground">Inactivo</Badge>
        ),
    },
  ];
}

interface ResourceListProps {
  rows: ResourceRow[];
  detailLabel: string;
  searchLabel: string;
  search: string;
  onSearchChange: (value: string) => void;
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription: string;
}

export function ResourceList({
  rows,
  detailLabel,
  searchLabel,
  search,
  onSearchChange,
  meta,
  onPageChange,
  isLoading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
}: ResourceListProps) {
  const tableColumns = buildColumns(detailLabel);
  const searchId = `resource-search-${detailLabel}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 sm:max-w-sm">
        <Label htmlFor={searchId}>{searchLabel}</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={searchId}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por código o nombre"
            className="pl-9"
          />
        </div>
      </div>

      {error ? <ErrorBanner error={error} onRetry={onRetry} /> : null}

      {!isLoading && !error && rows.length === 0 ? (
        <EmptyState
          icon={Search}
          title={emptyTitle}
          description={`${emptyDescription} Probá con otra búsqueda.`}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable columns={tableColumns} data={rows} isLoading={isLoading} skeletonRows={4} />
          </div>

          <ul className="space-y-2 md:hidden">
            {isLoading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <li
                    key={`skeleton-${index}`}
                    className="h-20 animate-pulse rounded-lg border bg-card"
                  />
                ))
              : rows.map((row) => (
                  <li key={row.id} className="rounded-lg border bg-card p-3 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.name}</p>
                        <p className="font-mono text-xs tabular-nums text-muted-foreground">
                          {row.code}
                        </p>
                      </div>
                      {row.isActive ? (
                        <Badge className="bg-success-soft text-success-soft-foreground">
                          Activo
                        </Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground">Inactivo</Badge>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {detailLabel}: {row.detail}
                    </p>
                  </li>
                ))}
          </ul>

          <PaginationBar
            page={meta.page}
            pageSize={meta.pageSize}
            total={meta.total}
            onPageChange={onPageChange}
          />
        </>
      )}
    </div>
  );
}
