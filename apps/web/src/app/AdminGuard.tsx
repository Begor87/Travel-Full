import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore.ts';

/** Restricts nested routes to admins. Non-admins are sent to the dashboard.
 *  The backend enforces admin access independently — this is just UX. */
export function AdminGuard() {
  const user = useAuthStore((s) => s.user);
  // While the user is still loading, render nothing rather than bouncing.
  if (user && user.role !== 'admin' && (user.role as string) !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
