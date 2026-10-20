import { parseProblemDetail, type ProblemDetail } from '@/lib/problem-detail';
import {
  clearTokens,
  getStoredTokens,
  notifyUnauthorized,
  saveTokens,
} from '@/lib/token-storage';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ApiClientConfig {
  baseUrl: string;
  tokenProvider: () => string | null;
  refreshTokenProvider?: () => string | null;
  onTokensRefreshed?: (tokens: TokenResponse) => void;
  onUnauthorized?: () => void;
}

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail | null;

  constructor(status: number, problem: ProblemDetail | null) {
    super(problem?.detail ?? `Error ${status} al contactar el servidor`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

export class ApiClient {
  private readonly config: ApiClientConfig;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  async request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    const response = await this.send(method, path, body, true);
    if (response.status !== 401 || this.config.tokenProvider() === null) {
      return this.parse<T>(response);
    }

    // A single refresh attempt; concurrent 401s share the same in-flight refresh.
    const refreshed = await this.refreshTokens();
    if (!refreshed) {
      this.config.onUnauthorized?.();
      return this.parse<T>(response);
    }

    return this.parse<T>(await this.send(method, path, body, true));
  }

  private refreshTokens(): Promise<boolean> {
    this.refreshPromise ??= this.performRefresh().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  private async performRefresh(): Promise<boolean> {
    const refreshToken = this.config.refreshTokenProvider?.() ?? null;
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await this.send('POST', '/auth/refresh', { refreshToken }, false);
      if (!response.ok) {
        return false;
      }
      const tokens = (await response.json()) as TokenResponse;
      this.config.onTokensRefreshed?.(tokens);
      return true;
    } catch {
      // Network failure while refreshing: the session cannot be recovered, so sign out.
      return false;
    }
  }

  private send(
    method: HttpMethod,
    path: string,
    body: unknown,
    withAuth: boolean,
  ): Promise<Response> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = withAuth ? this.config.tokenProvider() : null;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return fetch(`${this.config.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  private async parse<T>(response: Response): Promise<T> {
    if (response.ok) {
      const text = await response.text();
      return text.length === 0 ? (undefined as unknown as T) : (JSON.parse(text) as T);
    }

    const payload = await this.readBody(response);
    throw new ApiError(response.status, parseProblemDetail(payload));
  }

  private async readBody(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      // Non-JSON error page (proxy, gateway): keep the status without a problem document.
      return null;
    }
  }
}

export const apiClient = new ApiClient({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
  tokenProvider: () => getStoredTokens()?.accessToken ?? null,
  refreshTokenProvider: () => getStoredTokens()?.refreshToken ?? null,
  onTokensRefreshed: (tokens) => saveTokens(tokens),
  onUnauthorized: () => {
    clearTokens();
    notifyUnauthorized();
  },
});
