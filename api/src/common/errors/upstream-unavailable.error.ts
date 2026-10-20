import { DomainError } from './domain-error';

export class UpstreamUnavailableError extends DomainError {
  readonly code = 'UPSTREAM_UNAVAILABLE';
  readonly status = 502;

  constructor(message = 'Un servicio externo no está disponible en este momento.') {
    super(message);
  }
}
