import { DomainError } from '../../../common/errors/domain-error';

export class InvalidStateTransitionError extends DomainError {
  readonly code = 'INVALID_STATE_TRANSITION';
  readonly status = 409;

  constructor(message = 'La transición de estado solicitada no es válida.') {
    super(message);
  }
}
