import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.tsx';
import { MobileSidebar } from './MobileSidebar.tsx';

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <MobileSidebar />

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
