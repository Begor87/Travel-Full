import type { ApiError } from '@wanderlog/shared';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function parseError(res: Response): Promise<ApiClientError> {
  try {
    const body = (await res.json()) as ApiError;
    return new ApiClientError(
      body.error.code,
      body.error.message,
      res.status,
      body.error.details,
    );
  } catch {
    return new ApiClientError('NETWORK_ERROR', `HTTP ${res.status}`, res.status);
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, ...init } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(skipAuth ? {} : getAuthHeaders()),
    ...(init.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  // Token refresh on 401
  if (res.status === 401 && !skipAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const retryHeaders = { ...headers, ...getAuthHeaders() };
      const retryRes = await fetch(`${BASE_URL}${path}`, { ...init, headers: retryHeaders });
      if (!retryRes.ok) throw await parseError(retryRes);
      return retryRes.json() as Promise<T>;
    }
    // Refresh failed — dispatch logout event
    window.dispatchEvent(new CustomEvent('auth:logout'));
    throw new ApiClientError('AUTHENTICATION_ERROR', 'Session expired', 401);
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const { data } = await res.json() as { data: { accessToken: string; refreshToken: string } };
    localStorage.setItem('access_token', data.accessToken);
    localStorage.setItem('refresh_token', data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
