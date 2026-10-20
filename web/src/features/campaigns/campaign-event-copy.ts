import type { CampaignEventType } from './types';

export const EVENT_TITLES: Record<CampaignEventType, string> = {
  created: 'Campaña creada',
  status_changed: 'Estado actualizado',
  booking_created: 'Reserva creada',
  booking_released: 'Reservas liberadas',
  weather_blocked: 'Bloqueada por clima',
  rescheduled: 'Reprogramada',
  observations_published: 'Resultados publicados',
  cancelled: 'Cancelada',
};

/** Compact, human-readable summary of an event payload (audit detail stays in Mongo). */
export function summarizePayload(payload: Record<string, unknown>): string | null {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (parts.length === 3) {
      break;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      parts.push(`${key}: ${String(value)}`);
    }
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}
