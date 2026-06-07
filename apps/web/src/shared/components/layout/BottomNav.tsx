import { NavLink } from 'react-router-dom';
import { Compass, Map, Calendar, Wallet, Menu } from 'lucide-react';
import { cn } from '@/shared/utils/cn.ts';
import { useUiStore } from '@/store/uiStore.ts';

const items = [
  { to: '/dashboard', icon: Compass, label: 'Home' },
  { to: '/trips', icon: Map, label: 'Trips' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/budget', icon: Wallet, label: 'Budget' },
];

/**
 * Persistent bottom navigation for mobile. Always visible, thumb-reachable —
 * the standard mobile pattern so primary destinations are one tap away from
 * anywhere in the app. Hidden on desktop where the sidebar takes over.
 */
export function BottomNav() {
  const { setMobileSidebarOpen } = useUiStore();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[11px] font-medium transition-colors',
                isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-slate-500 dark:text-slate-400',
              )
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}

        {/* "More" opens the full slide-out menu (Documents, People, Settings, profile) */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[11px] font-medium text-slate-500 dark:text-slate-400"
        >
          <Menu className="w-5 h-5" />
          More
        </button>
      </div>
    </nav>
  );
}
