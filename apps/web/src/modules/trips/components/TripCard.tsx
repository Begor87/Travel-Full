import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { MapPin, Users, Calendar } from 'lucide-react';
import { cn } from '@/shared/utils/cn.ts';
import { Badge } from '@/shared/components/ui/Badge.tsx';
import type { Trip } from '@wanderlog/shared';

interface TripCardProps {
  trip: Trip;
  compact?: boolean;
}

const statusConfig: Record<string, { label: string; variant: 'blue' | 'green' | 'slate' | 'amber' }> = {
  planning: { label: 'Planning', variant: 'blue' },
  PLANNING: { label: 'Planning', variant: 'blue' },
  active: { label: 'Active', variant: 'green' },
  ACTIVE: { label: 'Active', variant: 'green' },
  completed: { label: 'Completed', variant: 'slate' },
  COMPLETED: { label: 'Completed', variant: 'slate' },
  archived: { label: 'Archived', variant: 'amber' },
  ARCHIVED: { label: 'Archived', variant: 'amber' },
};

const COVER_GRADIENTS = [
  'from-blue-400 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-amber-400 to-orange-600',
  'from-rose-400 to-pink-600',
  'from-violet-400 to-purple-600',
  'from-sky-400 to-cyan-600',
];

function getCoverGradient(title: string) {
  const idx = title.charCodeAt(0) % COVER_GRADIENTS.length;
  return COVER_GRADIENTS[idx];
}

export function TripCard({ trip, compact }: TripCardProps) {
  const status = statusConfig[trip.status] ?? { label: trip.status, variant: 'slate' as const };
  const duration = differenceInDays(new Date(trip.endDate), new Date(trip.startDate)) + 1;
  const destinations = trip.destinations ?? [];

  return (
    <Link to={`/trips/${trip.id}`} className="block group">
      <div className={cn(
        'card overflow-hidden transition-all duration-200',
        'hover:shadow-card-lg hover:-translate-y-0.5',
        compact && 'flex gap-4 p-3',
      )}>
        {/* Cover */}
        {!compact && (
          <div className={cn(
            'h-40 bg-gradient-to-br',
            getCoverGradient(trip.title),
            'relative flex items-end p-4',
          )}>
            {trip.coverImageUrl && (
              <img
                src={trip.coverImageUrl}
                alt={trip.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <Badge variant={status.variant} className="relative z-10">
              {status.label}
            </Badge>
          </div>
        )}

        {/* Content */}
        <div className={cn('p-4', compact && 'flex-1 p-0 min-w-0')}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate text-sm group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              {trip.title}
            </h3>
            {compact && <Badge variant={status.variant}>{status.label}</Badge>}
          </div>

          <div className="mt-2 space-y-1.5">
            {destinations.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">
                  {destinations.slice(0, 2).map((d) => d.name).join(' → ')}
                  {destinations.length > 2 && ` +${destinations.length - 2}`}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                {format(new Date(trip.startDate), 'MMM d')}
                {' – '}
                {format(new Date(trip.endDate), 'MMM d, yyyy')}
                {' '}
                <span className="text-slate-400 dark:text-slate-500">({duration}d)</span>
              </span>
            </div>

            {trip.collaboratorCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Users className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{trip.collaboratorCount + 1} traveller{trip.collaboratorCount !== 0 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
