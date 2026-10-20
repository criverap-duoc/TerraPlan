import { apiClient } from '@/lib/api-client';

import type { TokenPair, User } from './types';

export function loginRequest(email: string, password: string): Promise<TokenPair> {
  return apiClient.request<TokenPair>('POST', '/auth/login', { email, password });
}

export function refreshRequest(refreshToken: string): Promise<TokenPair> {
  return apiClient.request<TokenPair>('POST', '/auth/refresh', { refreshToken });
}

export function meRequest(): Promise<User> {
  return apiClient.request<User>('GET', '/auth/me');
}
