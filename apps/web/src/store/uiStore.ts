import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type SidebarState = 'expanded' | 'collapsed';

interface UiState {
  theme: Theme;
  sidebar: SidebarState;
  isMobileSidebarOpen: boolean;

  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  resolvedTheme: () => 'light' | 'dark';
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      sidebar: 'expanded',
      isMobileSidebarOpen: false,

      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      toggleSidebar: () =>
        set((s) => ({ sidebar: s.sidebar === 'expanded' ? 'collapsed' : 'expanded' })),

      setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),

      resolvedTheme: () => {
        const { theme } = get();
        if (theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
      },
    }),
    {
      name: 'wanderlog-ui',
      partialize: (state) => ({ theme: state.theme, sidebar: state.sidebar }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', isDark);
  }
}
