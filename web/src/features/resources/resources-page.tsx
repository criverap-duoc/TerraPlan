import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/domain/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { PaginationMeta } from '@/lib/pagination';

import { ResourceList } from './resource-list';
import { toEquipmentRow, toTechnicianRow, toVehicleRow } from './resource-rows';
import { useEquipment } from './use-equipment';
import { useTechnicians } from './use-technicians';
import { useVehicles } from './use-vehicles';

const PAGE_SIZE = 25;
const EMPTY_META: PaginationMeta = { page: 1, pageSize: PAGE_SIZE, total: 0 };

function useResourceSearch() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim(), 300);

  useEffect(() => {
    setPage(1);
  }, [q]);

  return { search, setSearch, page, setPage, q };
}

function TechniciansTab() {
  const { search, setSearch, page, setPage, q } = useResourceSearch();
  const query = useTechnicians({ q: q || undefined, page, pageSize: PAGE_SIZE });

  return (
    <ResourceList
      rows={(query.data?.data ?? []).map(toTechnicianRow)}
      detailLabel="Especialidades"
      searchLabel="Buscar técnico"
      search={search}
      onSearchChange={setSearch}
      meta={query.data?.meta ?? { ...EMPTY_META, page }}
      onPageChange={setPage}
      isLoading={query.isPending}
      error={query.error}
      onRetry={() => void query.refetch()}
      emptyTitle="No hay técnicos registrados"
      emptyDescription="Todavía no hay técnicos que coincidan con la búsqueda."
    />
  );
}

function EquipmentTab() {
  const { search, setSearch, page, setPage, q } = useResourceSearch();
  const query = useEquipment({ q: q || undefined, page, pageSize: PAGE_SIZE });

  return (
    <ResourceList
      rows={(query.data?.data ?? []).map(toEquipmentRow)}
      detailLabel="Categoría"
      searchLabel="Buscar equipo"
      search={search}
      onSearchChange={setSearch}
      meta={query.data?.meta ?? { ...EMPTY_META, page }}
      onPageChange={setPage}
      isLoading={query.isPending}
      error={query.error}
      onRetry={() => void query.refetch()}
      emptyTitle="No hay equipos registrados"
      emptyDescription="Todavía no hay equipos que coincidan con la búsqueda."
    />
  );
}

function VehiclesTab() {
  const { search, setSearch, page, setPage, q } = useResourceSearch();
  const query = useVehicles({ q: q || undefined, page, pageSize: PAGE_SIZE });

  return (
    <ResourceList
      rows={(query.data?.data ?? []).map(toVehicleRow)}
      detailLabel="Patente"
      searchLabel="Buscar vehículo"
      search={search}
      onSearchChange={setSearch}
      meta={query.data?.meta ?? { ...EMPTY_META, page }}
      onPageChange={setPage}
      isLoading={query.isPending}
      error={query.error}
      onRetry={() => void query.refetch()}
      emptyTitle="No hay vehículos registrados"
      emptyDescription="Todavía no hay vehículos que coincidan con la búsqueda."
    />
  );
}

export function ResourcesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Recursos" description="Técnicos, equipos y vehículos reservables." />

      <Tabs defaultValue="technicians" className="gap-4">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="technicians">Técnicos</TabsTrigger>
          <TabsTrigger value="equipment">Equipos</TabsTrigger>
          <TabsTrigger value="vehicles">Vehículos</TabsTrigger>
        </TabsList>

        <TabsContent value="technicians">
          <TechniciansTab />
        </TabsContent>
        <TabsContent value="equipment">
          <EquipmentTab />
        </TabsContent>
        <TabsContent value="vehicles">
          <VehiclesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
