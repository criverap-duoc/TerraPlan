export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export const UNAUTHORIZED_EVENT = 'terraplan:unauthorized';

const STORAGE_KEY = 'terraplan.tokens';

function isStoredTokens(value: unknown): value is StoredTokens {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.accessToken === 'string' && typeof candidate.refreshToken === 'string';
}

export function getStoredTokens(): StoredTokens | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isStoredTokens(parsed) ? parsed : null;
  } catch {
    // Private mode or corrupted payload: behave as a signed-out session.
    return null;
  }
}

export function saveTokens(tokens: StoredTokens): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    // Storage is unavailable (private mode or quota); the in-memory session still works.
    return;
  }
}

export function clearTokens(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

export function notifyUnauthorized(): void {
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}
