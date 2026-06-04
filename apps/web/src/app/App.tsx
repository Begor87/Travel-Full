import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { AppLayout } from '@/shared/components/layout/AppLayout.tsx';
import { AuthGuard } from './AuthGuard.tsx';
import { OnlineStatusProvider } from './OnlineStatusProvider.tsx';

// Pages — lazy loaded for code splitting
import { lazy, Suspense } from 'react';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner.tsx';

const LoginPage = lazy(() => import('@/modules/auth/pages/LoginPage.tsx'));
const RegisterPage = lazy(() => import('@/modules/auth/pages/RegisterPage.tsx'));
const DashboardPage = lazy(() => import('@/modules/trips/pages/DashboardPage.tsx'));
const TripsPage = lazy(() => import('@/modules/trips/pages/TripsPage.tsx'));
const TripDetailPage = lazy(() => import('@/modules/trips/pages/TripDetailPage.tsx'));
const ItineraryPage = lazy(() => import('@/modules/itinerary/pages/ItineraryPage.tsx'));
const BudgetPage = lazy(() => import('@/modules/budget/pages/BudgetPage.tsx'));
const CollaboratorsPage = lazy(() => import('@/modules/collaboration/pages/CollaboratorsPage.tsx'));
const AiAssistantPage = lazy(() => import('@/modules/ai/pages/AiAssistantPage.tsx'));
const SettingsPage = lazy(() => import('@/modules/auth/pages/SettingsPage.tsx'));
const NotFoundPage = lazy(() => import('./NotFoundPage.tsx'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: (failureCount, error) => {
        // Don't retry auth or not-found errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status === 401 || status === 403 || status === 404) return false;
        }
        return failureCount < 2;
      },
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <OnlineStatusProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected app routes */}
              <Route element={<AuthGuard />}>
                <Route element={<AppLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/trips" element={<TripsPage />} />
                  <Route path="/trips/:tripId" element={<TripDetailPage />} />
                  <Route path="/trips/:tripId/itinerary" element={<ItineraryPage />} />
                  <Route path="/trips/:tripId/budget" element={<BudgetPage />} />
                  <Route path="/trips/:tripId/people" element={<CollaboratorsPage />} />
                  <Route path="/trips/:tripId/ai" element={<AiAssistantPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>

        <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'text-sm font-medium',
            style: {
              background: 'var(--color-surface)',
              color: 'inherit',
              borderRadius: '12px',
              border: '1px solid rgb(226 232 240)',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
            },
          }}
        />
      </OnlineStatusProvider>

      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
