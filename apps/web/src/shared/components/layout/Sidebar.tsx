import { NavLink, useLocation } from 'react-router-dom';
import {
  Compass,
  Map,
  Calendar,
  Wallet,
  FileText,
  Users,
  Settings,
  ChevronLeft,
  Wifi,
  WifiOff,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/shared/utils/cn.ts';
import { useUiStore } from '@/store/uiStore.ts';
import { useSyncStore } from '@/store/syncStore.ts';
import { Avatar } from '../ui/Avatar.tsx';
import { useAuthStore } from '@/store/authStore.ts';

const nav = [
  { to: '/dashboard', icon: Compass, label: 'Dashboard' },
  { to: '/trips', icon: Map, label: 'My Trips' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/budget', icon: Wallet, label: 'Budget' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/people', icon: Users, label: 'People' },
];

interface SidebarLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
}

function SidebarLink({ to, icon: Icon, label, collapsed }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
          'transition-all duration-150',
          'hover:bg-slate-100 dark:hover:bg-slate-800',
          isActive
            ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
            : 'text-slate-600 dark:text-slate-400',
          collapsed && 'justify-center px-2',
        )
      }
      title={collapsed ? label : undefined}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const { sidebar, toggleSidebar } = useUiStore();
  const { isOnline } = useSyncStore();
  const { user } = useAuthStore();
  const location = useLocation();

  const collapsed = sidebar === 'collapsed';

  // Extract tripId from URL for context-aware nav
  const tripMatch = location.pathname.match(/\/trips\/([^/]+)/);
  const currentTripId = tripMatch?.[1];

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen sticky top-0',
        'bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800',
        'transition-all duration-300',
        collapsed ? 'w-[64px]' : 'w-[220px]',
      )}
    >
      {/* Logo — links home */}
      <NavLink
        to="/dashboard"
        className={cn('flex items-center gap-2 p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors', collapsed && 'justify-center')}
        title="Home"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
          <Compass className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
            Wanderlog
          </span>
        )}
      </NavLink>

      {/* Main nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map((item) => (
          <SidebarLink key={item.to} {...item} collapsed={collapsed} />
        ))}

        {/* Trip-contextual AI link */}
        {currentTripId && !collapsed && (
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="px-3 mb-2 text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Current Trip
            </p>
            <NavLink
              to={`/trips/${currentTripId}/ai`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                  'transition-all duration-150',
                  'hover:bg-slate-100 dark:hover:bg-slate-800',
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                    : 'text-slate-600 dark:text-slate-400',
                )
              }
            >
              <Sparkles className="w-5 h-5 flex-shrink-0 text-amber-500" />
              <span>AI Assistant</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className={cn('p-3 border-t border-slate-100 dark:border-slate-800 space-y-1')}>
        {/* Sync status */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl text-xs',
            isOnline
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400',
            collapsed && 'justify-center px-2',
          )}
          title={isOnline ? 'Online — synced' : 'Offline — changes queued'}
        >
          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {!collapsed && <span>{isOnline ? 'Online' : 'Offline'}</span>}
        </div>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
              'transition-all duration-150 hover:bg-slate-100 dark:hover:bg-slate-800',
              isActive ? 'text-brand-700 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400',
              collapsed && 'justify-center px-2',
            )
          }
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        {user && (
          <NavLink
            to="/profile"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl',
              'hover:bg-slate-100 dark:hover:bg-slate-800 transition-all',
              collapsed && 'justify-center px-2',
            )}
          >
            <Avatar src={user.avatarUrl} name={user.name} size="sm" />
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
              </div>
            )}
          </NavLink>
        )}

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl w-full',
            'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
            'hover:bg-slate-100 dark:hover:bg-slate-800 transition-all',
            collapsed && 'justify-center px-2',
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
