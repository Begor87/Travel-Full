import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Sun, Moon, Monitor, User, Bell, Shield, Globe, LogOut as LogOutAll } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore.ts';
import { useUiStore } from '@/store/uiStore.ts';
import { authApi } from '@/services/api/auth.ts';
import { api } from '@/services/api/client.ts';
import { Button } from '@/shared/components/ui/Button.tsx';
import { Input } from '@/shared/components/ui/Input.tsx';
import { TopBar } from '@/shared/components/layout/TopBar.tsx';
import { cn } from '@/shared/utils/cn.ts';
import { usePreferences } from '@/shared/hooks/usePreferences.ts';
import { CURRENCIES, getCurrencyName, type User as UserType, type UserPreferences } from '@wanderlog/shared';

type Theme = 'light' | 'dark' | 'system';

const DATE_FORMATS = ['DD.MM.YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const WEEK_STARTS: { value: 0 | 1 | 6; label: string }[] = [
  { value: 1, label: 'Monday' },
  { value: 0, label: 'Sunday' },
  { value: 6, label: 'Saturday' },
];

// Full IANA timezone list where the browser supports it, with a curated
// fallback for older engines.
const TIMEZONES: string[] = (() => {
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    if (supported) return supported('timeZone');
  } catch { /* ignore */ }
  return [
    'UTC', 'Europe/Oslo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
    'Europe/Rome', 'Europe/Madrid', 'America/New_York', 'America/Chicago',
    'America/Denver', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Singapore',
    'Asia/Dubai', 'Australia/Sydney',
  ];
})();

const THEMES: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, setUser, refreshToken, logout } = useAuthStore();
  const { theme, setTheme } = useUiStore();
  const prefs = usePreferences();

  // Persist a single preference change, optimistically updating the store.
  const updatePref = async (patch: Partial<UserPreferences>) => {
    if (!user) return;
    const previous = user;
    setUser({ ...user, preferences: { ...user.preferences, ...patch } } as UserType);
    try {
      await api.patch('/users/me/preferences', patch);
    } catch {
      setUser(previous);
      toast.error('Could not save preference');
    }
  };

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
            <p className="text-sm text-slate-500 dark:text-slate-400">
              @{user?.username}{user?.email ? ` · ${user.email}` : ''}
            </p>
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

        {/* Regional & formatting */}
        <section className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Regional & formatting</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Default currency</label>
              <select
                className="input"
                value={prefs.currency}
                onChange={(e) => updatePref({ currency: e.target.value })}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {getCurrencyName(c.code)}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Used for budget summaries and new expenses.</p>
            </div>

            <div>
              <label className="label">Date format</label>
              <select
                className="input"
                value={prefs.dateFormat}
                onChange={(e) => updatePref({ dateFormat: e.target.value })}
              >
                {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Time format</label>
              <select
                className="input"
                value={prefs.timeFormat}
                onChange={(e) => updatePref({ timeFormat: e.target.value as '12h' | '24h' })}
              >
                <option value="24h">24-hour (14:30)</option>
                <option value="12h">12-hour (2:30 PM)</option>
              </select>
            </div>

            <div>
              <label className="label">Week starts on</label>
              <select
                className="input"
                value={prefs.weekStartsOn}
                onChange={(e) => updatePref({ weekStartsOn: Number(e.target.value) as 0 | 1 | 6 })}
              >
                {WEEK_STARTS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Units</label>
              <select
                className="input"
                value={prefs.distanceUnit}
                onChange={(e) => updatePref({ distanceUnit: e.target.value as 'km' | 'mi' })}
              >
                <option value="km">Metric (km, °C)</option>
                <option value="mi">Imperial (mi, °F)</option>
              </select>
            </div>

            <div>
              <label className="label">Timezone</label>
              <select
                className="input"
                value={prefs.timezone}
                onChange={(e) => updatePref({ timezone: e.target.value })}
              >
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
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

        {/* Security */}
        <SecuritySection />

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

function SecuritySection() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword(current, next);
      toast.success('Password changed — signing you out…');
      // Changing the password revokes all sessions, so log back in fresh.
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change password');
    } finally {
      setSaving(false);
    }
  };

  const signOutEverywhere = async () => {
    try {
      await authApi.logoutAll();
    } catch {
      /* best effort */
    }
    logout();
    navigate('/login', { replace: true });
    toast.success('Signed out of all devices');
  };

  return (
    <section className="card p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-5 h-5 text-slate-500" />
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Security</h2>
      </div>

      <form onSubmit={submit} className="space-y-3 max-w-sm">
        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters, with an uppercase letter and a number"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <Button type="submit" variant="primary" size="sm" loading={saving}>
          Change password
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Active sessions</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Sign out of every device, including this one. Useful if you suspect someone else has access.
        </p>
        <Button variant="outline" size="sm" leftIcon={<LogOutAll className="w-4 h-4" />} onClick={signOutEverywhere}>
          Sign out everywhere
        </Button>
      </div>
    </section>
  );
}
