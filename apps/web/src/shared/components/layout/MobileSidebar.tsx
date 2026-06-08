import { NavLink } from 'react-router-dom';
import { X, Compass, Map, Calendar, Wallet, FileText, Users, Settings, User, ShieldCheck } from 'lucide-react';
import { useUiStore } from '@/store/uiStore.ts';
import { useAuthStore } from '@/store/authStore.ts';
import { cn } from '@/shared/utils/cn.ts';
import { Button } from '../ui/Button.tsx';

const baseNav = [
  { to: '/dashboard', icon: Compass, label: 'Dashboard' },
  { to: '/trips', icon: Map, label: 'My Trips' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/budget', icon: Wallet, label: 'Budget' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/people', icon: Users, label: 'People' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function MobileSidebar() {
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useUiStore();
  const user = useAuthStore((s) => s.user);
  const isAdmin = !!user && (user.role === 'admin' || (user.role as string) === 'ADMIN');
  const nav = isAdmin ? [...baseNav, { to: '/admin', icon: ShieldCheck, label: 'Admin' }] : baseNav;

  if (!isMobileSidebarOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Panel */}
      <div className="relative w-72 bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <NavLink
            to="/dashboard"
            onClick={() => setMobileSidebarOpen(false)}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">Wanderlog</span>
          </NavLink>
          <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all',
                  'hover:bg-slate-100 dark:hover:bg-slate-800',
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                    : 'text-slate-600 dark:text-slate-400',
                )
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
