import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Map, Plane, Clock, CheckCircle } from 'lucide-react';
import { tripsApi } from '@/services/api/trips.ts';
import { useAuthStore } from '@/store/authStore.ts';
import { Button } from '@/shared/components/ui/Button.tsx';
import { TopBar } from '@/shared/components/layout/TopBar.tsx';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner.tsx';
import { EmptyState } from '@/shared/components/ui/EmptyState.tsx';
import { TripCard } from '../components/TripCard.tsx';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function normalizeStatus(status: string) {
  return status.toLowerCase();
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: tripsData, isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => tripsApi.list(),
  });

  const trips = tripsData?.data ?? [];
  const activeTrips = trips.filter((t) => normalizeStatus(t.status) === 'active');
  const plannedTrips = trips.filter((t) => normalizeStatus(t.status) === 'planning');
  const completedTrips = trips.filter((t) => normalizeStatus(t.status) === 'completed');

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <TopBar
        actions={
          <Link to="/trips?new=1">
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              New Trip
            </Button>
          </Link>
        }
      />

      <div className="page-container">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {getGreeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {trips.length === 0
              ? 'Ready to plan your next adventure?'
              : `${trips.length} trip${trips.length !== 1 ? 's' : ''} in your collection`}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active', value: activeTrips.length, icon: Plane, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Planning', value: plannedTrips.length, icon: Clock, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Completed', value: completedTrips.length, icon: CheckCircle, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
            { label: 'Total', value: trips.length, icon: Map, color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-900/20' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {trips.length === 0 ? (
          <EmptyState
            icon={<Map className="w-8 h-8" />}
            title="No trips yet"
            description="Create your first trip and start building your itinerary."
            action={
              <Link to="/trips?new=1">
                <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                  Create your first trip
                </Button>
              </Link>
            }
          />
        ) : (
          <div>
            {/* Active trips */}
            {activeTrips.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="section-title">Active Trips</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {activeTrips.map((trip) => <TripCard key={trip.id} trip={trip} />)}
                </div>
              </section>
            )}

            {/* Upcoming planned */}
            {plannedTrips.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="section-title">Upcoming</h2>
                  <Link to="/trips" className="text-sm text-brand-600 dark:text-brand-400 hover:underline">
                    View all
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {plannedTrips.slice(0, 3).map((trip) => <TripCard key={trip.id} trip={trip} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
