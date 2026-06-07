import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, Users, Wallet, Sparkles } from 'lucide-react';
import { tripsApi } from '@/services/api/trips.ts';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner.tsx';

/**
 * Trip overview — the index page inside a trip. Reads the trip from the shared
 * query cache (TripDetailPage already fetched it), so it renders instantly.
 */
export default function TripOverviewPage() {
  const { tripId } = useParams<{ tripId: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['trips', tripId],
    queryFn: () => tripsApi.getById(tripId!),
    enabled: !!tripId,
  });

  const trip = data?.data as
    | { id: string; description?: string; destinations: { name: string; country: string }[]; _count?: { days: number; documents: number; expenses: number } }
    | undefined;

  if (isLoading) return <PageLoader />;
  if (!trip) return null;

  const destinations = trip.destinations ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {trip.description && (
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Description</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{trip.description}</p>
          </div>
        )}

        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { to: 'itinerary', icon: Calendar, label: 'View Itinerary' },
              { to: 'budget', icon: Wallet, label: 'Manage Budget' },
              { to: 'people', icon: Users, label: 'Collaborators' },
              { to: 'ai', icon: Sparkles, label: 'AI Assistant' },
            ].map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={`/trips/${trip.id}/${to}`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-all text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                <Icon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Destinations</h3>
          <div className="space-y-2">
            {destinations.map((dest, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-brand-500 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">{dest.name}</span>
                <span className="text-slate-400 dark:text-slate-500 text-xs">{dest.country}</span>
              </div>
            ))}
          </div>
        </div>

        {trip._count && (
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Stats</h3>
            <div className="space-y-2">
              {[
                { label: 'Days planned', value: trip._count.days },
                { label: 'Documents', value: trip._count.documents },
                { label: 'Expenses', value: trip._count.expenses },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{label}</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
