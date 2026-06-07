import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.tsx';
import { MobileSidebar } from './MobileSidebar.tsx';
import { BottomNav } from './BottomNav.tsx';

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <MobileSidebar />

      {/* pb on mobile keeps content clear of the fixed bottom nav */}
      <main className="flex-1 min-w-0 overflow-x-hidden pb-16 lg:pb-0">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
