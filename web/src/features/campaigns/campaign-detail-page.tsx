import { ChevronRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { CampaignStatusBadge } from '@/components/domain/campaign-status-badge';
import { ErrorBanner } from '@/components/domain/error-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/format';

import { CampaignActions } from './campaign-actions';
import { CampaignEventsTab } from './campaign-events-tab';
import { CampaignReservationsTab } from './campaign-reservations-tab';
import { CampaignSummaryTab } from './campaign-summary-tab';
import { CampaignWindowsTab } from './campaign-windows-tab';
import { useCampaign } from './use-campaign';

function Breadcrumb({ code }: { code?: string }) {
  return (
    <nav aria-label="Ruta de navegación" className="flex items-center gap-1 text-sm">
      <Link
        to="/campaigns"
        className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Campañas
      </Link>
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
      <span className="font-mono text-xs tabular-nums">{code ?? '…'}</span>
    </nav>
  );
}

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useCampaign(id);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumb />
        {query.error ? (
          <ErrorBanner error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <p className="text-sm text-muted-foreground">No encontramos esta campaña.</p>
        )}
      </div>
    );
  }

  const campaign = query.data;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb code={campaign.code} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                {campaign.code}
              </h1>
              <CampaignStatusBadge status={campaign.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Creada el {formatDate(campaign.createdAt)}
              {campaign.site ? ` · ${campaign.site.name}` : ''}
            </p>
          </div>
          <CampaignActions campaign={campaign} />
        </div>
      </div>

      <Tabs defaultValue="summary" className="gap-4">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="windows">Ventanas</TabsTrigger>
          <TabsTrigger value="reservations">Reservas</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <CampaignSummaryTab campaign={campaign} />
        </TabsContent>
        <TabsContent value="windows">
          <CampaignWindowsTab campaign={campaign} />
        </TabsContent>
        <TabsContent value="reservations">
          <CampaignReservationsTab campaign={campaign} />
        </TabsContent>
        <TabsContent value="events">
          <CampaignEventsTab campaign={campaign} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
