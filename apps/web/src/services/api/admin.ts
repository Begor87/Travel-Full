import { api } from './client.ts';
import type { ApiResponse } from '@wanderlog/shared';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  _count: { ownedTrips: number; refreshTokens: number };
}

export const adminApi = {
  listUsers: () => api.get<ApiResponse<AdminUser[]>>('/admin/users'),

  updateUser: (userId: string, data: { role?: 'USER' | 'ADMIN'; isActive?: boolean }) =>
    api.patch<ApiResponse<AdminUser>>(`/admin/users/${userId}`, data),

  resetPassword: (userId: string) =>
    api.post<ApiResponse<{ tempPassword: string }>>(`/admin/users/${userId}/reset-password`),

  deleteUser: (userId: string) => api.delete<void>(`/admin/users/${userId}`),

  getSignupCode: () => api.get<ApiResponse<{ code: string | null }>>('/admin/signup-code'),

  regenerateSignupCode: () =>
    api.post<ApiResponse<{ code: string }>>('/admin/signup-code/regenerate'),
};
