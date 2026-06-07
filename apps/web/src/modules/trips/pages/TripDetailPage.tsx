import { useQuery } from '@tanstack/react-query';
import { useParams, Link, NavLink, Outlet } from 'react-router-dom';
import { MapPin, Calendar, Sparkles, ArrowLeft } from 'lucide-react';
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

  return (
    <div>
      <TopBar
        actions={
          <Link to="/trips">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              All trips
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

      {/* Page content — overview or a nested trip sub-page */}
      <div className="page-container">
        <Outlet />
      </div>
    </div>
  );
}
