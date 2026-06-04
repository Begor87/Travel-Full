import { useNavigate } from 'react-router-dom';
import { LogOut, Sun, Moon, Monitor, User, Bell, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore.ts';
import { useUiStore } from '@/store/uiStore.ts';
import { authApi } from '@/services/api/auth.ts';
import { Button } from '@/shared/components/ui/Button.tsx';
import { TopBar } from '@/shared/components/layout/TopBar.tsx';
import { cn } from '@/shared/utils/cn.ts';

type Theme = 'light' | 'dark' | 'system';

const THEMES: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, refreshToken, logout } = useAuthStore();
  const { theme, setTheme } = useUiStore();

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // Best-effort logout
    }
    logout();
    navigate('/login', { replace: true });
    toast.success('Signed out');
  };

  return (
    <div>
      <TopBar title="Settings" />

      <div className="page-container max-w-2xl">
        {/* Profile */}
        <section className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Profile</h2>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
        </section>

        {/* Appearance */}
        <section className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Sun className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Appearance</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium',
                  theme === value
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600',
                )}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Notifications placeholder */}
        <section className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Notifications</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Notification preferences coming soon.
          </p>
        </section>

        {/* Security placeholder */}
        <section className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Security</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Change password and manage active sessions.
          </p>
          <Button variant="outline" size="sm" disabled>
            Change password
          </Button>
        </section>

        {/* Sign out */}
        <section className="card p-6">
          <Button variant="danger" onClick={handleLogout} leftIcon={<LogOut className="w-4 h-4" />}>
            Sign out
          </Button>
        </section>
      </div>
    </div>
  );
}
