import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export interface RequestWithId extends Request {
  id?: string;
}

// Minimal correlation id for the MVP; nestjs-pino replaces it when structured logging lands.
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();

  (req as RequestWithId).id = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
