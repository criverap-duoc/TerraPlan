import { cn } from 'cn';
import {
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  CloudRain,
  FileEdit,
  Truck,
  XCircle,
} from 'lucide-react';
import type { ComponentType } from 'react';

import type { CampaignStatus } from '@/features/campaigns/types';

interface StatusStyle {
  label: string;
  icon: ComponentType<{ className?: string }>;
  className: string;
}

const STATUS_STYLES: Record<CampaignStatus, StatusStyle> = {
  draft: {
    label: 'Borrador',
    icon: FileEdit,
    className: 'bg-muted text-muted-foreground',
  },
  planned: {
    label: 'Planificada',
    icon: CalendarClock,
    className: 'bg-info-soft text-info-soft-foreground',
  },
  confirmed: {
    label: 'Confirmada',
    icon: CalendarCheck,
    className: 'bg-accent text-accent-foreground',
  },
  in_field: {
    label: 'En terreno',
    icon: Truck,
    className: 'bg-primary text-primary-foreground',
  },
  completed: {
    label: 'Completada',
    icon: CheckCircle2,
    className: 'bg-success-soft text-success-soft-foreground',
  },
  needs_reschedule: {
    label: 'Reprogramar',
    icon: CloudRain,
    className: 'bg-warning-soft text-warning-soft-foreground',
  },
  cancelled: {
    label: 'Cancelada',
    icon: XCircle,
    className: 'bg-muted text-muted-foreground line-through',
  },
};

export function campaignStatusLabel(status: CampaignStatus): string {
  return STATUS_STYLES[status].label;
}

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
  className?: string;
}

export function CampaignStatusBadge({ status, className }: CampaignStatusBadgeProps) {
  const { label, icon: Icon, className: statusClassName } = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        statusClassName,
        className,
      )}
      aria-label={`Estado: ${label}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
