import { DomainError } from '../../../common/errors/domain-error';
import type { ReservationResourceType } from '../types/reservation.types';

export class ResourceConflictError extends DomainError {
  readonly code = 'RESOURCE_CONFLICT';
  readonly status = 409;
  readonly resourceType: ReservationResourceType;
  readonly resourceId: string;
  // Enriched by the service so the API can name the resource (e.g. "VH-01").
  resourceCode: string | null;

  constructor(
    resourceType: ReservationResourceType,
    resourceId: string,
    resourceCode: string | null = null,
  ) {
    super('Uno de los recursos ya está reservado en ese horario.');
    this.resourceType = resourceType;
    this.resourceId = resourceId;
    this.resourceCode = resourceCode;
  }
}
