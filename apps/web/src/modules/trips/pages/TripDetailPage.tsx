import { useQuery } from '@tanstack/react-query';
import { useParams, Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { MapPin, Calendar, Users, Wallet, Sparkles, ArrowLeft } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { tripsApi } from '@/services/api/trips.ts';
import { TopBar } from '@/shared/components/layout/TopBar.tsx';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner.tsx';
import { Badge } from '@/shared/components/ui/Badge.tsx';
import { Button } from '@/shared/components/ui/Button.tsx';
import { cn } from '@/shared/utils/cn.ts';

const COVER_GRADIENTS = [
  'from-blue-500 to-indigo-700',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-700',
  'from-rose-500 to-pink-700',
  'from-violet-500 to-purple-700',
  'from-sky-500 to-cyan-700',
];

function getCoverGradient(title: string) {
  const idx = title.charCodeAt(0) % COVER_GRADIENTS.length;
  return COVER_GRADIENTS[idx];
}

const NAV_TABS = [
  { to: '', label: 'Overview', end: true },
  { to: 'itinerary', label: 'Itinerary', end: false },
  { to: 'budget', label: 'Budget', end: false },
  { to: 'people', label: 'People', end: false },
  { to: 'ai', label: 'AI Assistant', end: false },
];

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const location = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ['trips', tripId],
    queryFn: () => tripsApi.getById(tripId!),
    enabled: !!tripId,
  });

  const trip = data?.data;

  if (isLoading) return <PageLoader />;
  if (!trip) return null;

  const duration = differenceInDays(new Date(trip.endDate), new Date(trip.startDate)) + 1;
  const destinations = trip.destinations ?? [];
  const isOverview = location.pathname === `/trips/${tripId}`;

  return (
    <div>
      <TopBar
        actions={
          <Link to="/trips">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          </Link>
        }
      />

      {/* Hero */}
      <div className={cn(
        'relative h-48 sm:h-64 bg-gradient-to-br',
        getCoverGradient(trip.title),
      )}>
        {trip.coverImageUrl && (
          <img src={trip.coverImageUrl} alt={trip.title} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-end justify-between">
            <div>
              <Badge variant={['active', 'ACTIVE'].includes(trip.status) ? 'green' : ['planning', 'PLANNING'].includes(trip.status) ? 'blue' : 'slate'} className="mb-2">
                {trip.status.charAt(0).toUpperCase() + trip.status.slice(1).toLowerCase()}
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{trip.title}</h1>
              <div className="flex items-center gap-4 mt-1 text-white/80 text-sm">
                {destinations.length > 0 && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {destinations.slice(0, 3).map((d) => d.name).join(' → ')}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(trip.startDate), 'MMM d')} – {format(new Date(trip.endDate), 'MMM d, yyyy')} · {duration}d
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="sticky top-14 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {NAV_TABS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={`/trips/${tripId}${to ? `/${to}` : ''}`}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
                    isActive
                      ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
                  )
                }
              >
                {to === 'ai' ? (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {label}
                  </span>
                ) : label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Page content */}
      <div className="page-container">
        {isOverview ? <TripOverview trip={trip} /> : <Outlet />}
      </div>
    </div>
  );
}

function TripOverview({ trip }: { trip: { id: string; description?: string; destinations: { name: string; country: string }[]; _count?: { days: number; documents: number; expenses: number } } }) {
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
