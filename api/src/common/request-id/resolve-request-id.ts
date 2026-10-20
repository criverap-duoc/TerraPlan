import { randomUUID } from 'node:crypto';

// Controllers pass `req.id` when the request-id middleware ran; the fallback keeps services safe
// when they are called from tests or internal flows.
export function resolveRequestId(id?: string | null): string {
  return id ?? randomUUID();
}
