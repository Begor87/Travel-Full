import { api } from './client.ts';
import type { ApiResponse, AuthTokens } from '@wanderlog/shared';
import type { LoginInput, RegisterInput } from '@wanderlog/shared';

export const authApi = {
  login: (data: LoginInput) =>
    api.post<ApiResponse<AuthTokens>>('/auth/login', data, { skipAuth: true }),

  register: (data: RegisterInput) =>
    api.post<ApiResponse<AuthTokens>>('/auth/register', data, { skipAuth: true }),

  logout: (refreshToken: string) =>
    api.post<void>('/auth/logout', { refreshToken }),

  refresh: (refreshToken: string) =>
    api.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken }, { skipAuth: true }),
};
