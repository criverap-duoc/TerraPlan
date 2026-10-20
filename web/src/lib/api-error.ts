import { ApiError } from './api-client';

export interface ErrorMessage {
  title: string;
  detail: string;
  requestId?: string;
  isForbidden: boolean;
}

/** Turns any thrown value into copy a coordinator can act on, without leaking internals. */
export function describeError(error: unknown): ErrorMessage {
  if (error instanceof ApiError) {
    const isForbidden = error.status === 403;
    return {
      title: isForbidden
        ? 'Sin permisos para ver esta sección'
        : (error.problem?.title ?? 'No se pudo cargar la información'),
      detail: isForbidden ? 'Pedí acceso a un coordinador para continuar.' : error.message,
      requestId: error.problem?.requestId,
      isForbidden,
    };
  }

  return {
    title: 'No se pudo conectar con el servidor',
    detail: 'Revisá tu conexión y volvé a intentar.',
    isForbidden: false,
  };
}
