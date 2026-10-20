export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  code?: string;
  detail: string;
  requestId?: string;
  errors?: string[];
}

/**
 * Parses an RFC 9457 `application/problem+json` body. Anything that is not a problem
 * document (HTML error pages, empty bodies, proxies) returns `null` so callers can fall
 * back to a generic message instead of rendering garbage.
 */
export function parseProblemDetail(body: unknown): ProblemDetail | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const candidate = body as Record<string, unknown>;
  if (typeof candidate.status !== 'number' || typeof candidate.title !== 'string') {
    return null;
  }

  return {
    type: typeof candidate.type === 'string' ? candidate.type : 'about:blank',
    title: candidate.title,
    status: candidate.status,
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    detail: typeof candidate.detail === 'string' ? candidate.detail : candidate.title,
    requestId: typeof candidate.requestId === 'string' ? candidate.requestId : undefined,
    errors: Array.isArray(candidate.errors)
      ? candidate.errors.filter((item): item is string => typeof item === 'string')
      : undefined,
  };
}
