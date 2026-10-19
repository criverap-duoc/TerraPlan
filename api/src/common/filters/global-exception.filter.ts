import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { ResourceConflictError } from '../../modules/reservations/errors/resource-conflict.error';
import type { ReservationResourceType } from '../../modules/reservations/types/reservation.types';
import { DomainError } from '../errors/domain-error';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  requestId: string;
  errors?: string[];
}

interface StatusDescriptor {
  code: string;
  title: string;
  detail: string;
}

const STATUS_DESCRIPTORS: Record<number, StatusDescriptor> = {
  400: {
    code: 'VALIDATION_ERROR',
    title: 'Bad Request',
    detail: 'La solicitud contiene datos inválidos.',
  },
  401: {
    code: 'UNAUTHORIZED',
    title: 'Unauthorized',
    detail: 'Se requiere autenticación.',
  },
  403: {
    code: 'FORBIDDEN',
    title: 'Forbidden',
    detail: 'No tienes permisos para realizar esta acción.',
  },
  404: {
    code: 'NOT_FOUND',
    title: 'Not Found',
    detail: 'El recurso solicitado no existe.',
  },
  409: {
    code: 'RESOURCE_CONFLICT',
    title: 'Conflict',
    detail: 'La operación entra en conflicto con el estado actual.',
  },
  422: {
    code: 'UNPROCESSABLE_ENTITY',
    title: 'Unprocessable Entity',
    detail: 'La operación no puede completarse con esos datos.',
  },
  429: {
    code: 'TOO_MANY_REQUESTS',
    title: 'Too Many Requests',
    detail: 'Demasiadas solicitudes. Espera un momento.',
  },
  502: {
    code: 'UPSTREAM_UNAVAILABLE',
    title: 'Bad Gateway',
    detail: 'Un servicio externo no está disponible en este momento.',
  },
  500: {
    code: 'INTERNAL',
    title: 'Internal Server Error',
    detail: 'Ocurrió un error inesperado. Intenta nuevamente.',
  },
};

const RESOURCE_LABELS: Record<ReservationResourceType, string> = {
  technician: 'El técnico',
  equipment: 'El equipo',
  vehicle: 'El vehículo',
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request & { id?: string }>();
    const response = context.getResponse<Response>();
    const requestId = request.id ?? randomUUID();
    const problem = this.toProblem(exception, requestId);

    if (problem.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`[${requestId}] ${problem.code}: ${problem.detail}`, stack);
    }

    response.status(problem.status).type('application/problem+json').json(problem);
  }

  private toProblem(exception: unknown, requestId: string): ProblemDetails {
    if (exception instanceof ResourceConflictError) {
      return {
        type: 'about:blank',
        title: 'Resource already booked',
        status: exception.status,
        code: exception.code,
        detail: `${RESOURCE_LABELS[exception.resourceType]} ${
          exception.resourceCode ?? exception.resourceId
        } ya está reservado en ese horario.`,
        requestId,
      };
    }

    if (exception instanceof DomainError) {
      const descriptor = this.describe(exception.status);

      return {
        type: 'about:blank',
        title: descriptor.title,
        status: exception.status,
        code: exception.code,
        detail: exception.message,
        requestId,
      };
    }

    if (exception instanceof HttpException) {
      return this.fromHttpException(exception, requestId);
    }

    const descriptor = this.describe(HttpStatus.INTERNAL_SERVER_ERROR);

    return {
      type: 'about:blank',
      title: descriptor.title,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: descriptor.code,
      detail: descriptor.detail,
      requestId,
    };
  }

  private fromHttpException(exception: HttpException, requestId: string): ProblemDetails {
    const status = exception.getStatus();
    const descriptor = this.describe(status);
    const payload = exception.getResponse();
    let detail = descriptor.detail;
    let errors: string[] | undefined;

    if (typeof payload === 'string') {
      detail = this.humanize(payload);
    } else if (payload !== null && typeof payload === 'object') {
      const { message } = payload as { message?: unknown };

      if (Array.isArray(message)) {
        errors = message.filter((item): item is string => typeof item === 'string');
        detail = 'La solicitud contiene datos inválidos.';
      } else if (typeof message === 'string') {
        detail = this.humanize(message);
      }
    }

    return {
      type: 'about:blank',
      title: descriptor.title,
      status,
      code: descriptor.code,
      detail,
      requestId,
      ...(errors ? { errors } : {}),
    };
  }

  // Nest's built-in pipes and router speak English; user-facing copy stays in Spanish.
  private humanize(message: string): string {
    if (message.startsWith('Validation failed')) {
      return 'Uno o más parámetros de la ruta no son válidos.';
    }

    if (message.startsWith('Cannot ')) {
      return 'El recurso solicitado no existe.';
    }

    return message;
  }

  private describe(status: number): StatusDescriptor {
    return (
      STATUS_DESCRIPTORS[status] ?? {
        code: 'HTTP_ERROR',
        title: 'Error',
        detail: 'La solicitud no pudo completarse.',
      }
    );
  }
}
