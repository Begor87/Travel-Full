import { Menu, Search, Bell, Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '../ui/Button.tsx';
import { useUiStore } from '@/store/uiStore.ts';

interface TopBarProps {
  title?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, actions }: TopBarProps) {
  const { theme, setTheme, setMobileSidebarOpen } = useUiStore();

  const cycleTheme = () => {
    const next: Record<string, 'light' | 'dark' | 'system'> = {
      light: 'dark',
      dark: 'system',
      system: 'light',
    };
    setTheme(next[theme]);
  };

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileSidebarOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {title && (
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-1">
        {actions}

        <Button variant="ghost" size="icon" title="Search (⌘K)">
          <Search className="w-4 h-4" />
        </Button>

        <Button variant="ghost" size="icon" title="Notifications">
          <Bell className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={cycleTheme}
          title={`Theme: ${theme}`}
        >
          <ThemeIcon className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
