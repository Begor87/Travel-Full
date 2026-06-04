import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore.ts';
import { useEffect } from 'react';
import { api } from '@/services/api/client.ts';
import type { ApiResponse, User } from '@wanderlog/shared';

export function AuthGuard() {
  const { isAuthenticated, setUser, logout } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Hydrate user profile on mount
    api.get<ApiResponse<User>>('/users/me')
      .then(({ data }) => setUser(data as unknown as User))
      .catch(() => logout());
  }, [isAuthenticated, setUser, logout]);

  // Listen for auth expiry events from the API client
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [logout]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
