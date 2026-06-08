import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns';
import { api } from '@/services/api/client.ts';
import { TopBar } from '@/shared/components/layout/TopBar.tsx';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner.tsx';
import { EmptyState } from '@/shared/components/ui/EmptyState.tsx';
import { Badge } from '@/shared/components/ui/Badge.tsx';
import { cn } from '@/shared/utils/cn.ts';
import { usePreferences } from '@/shared/hooks/usePreferences.ts';
import { formatDate, weekNumber, formatWeekday } from '@/shared/utils/format.ts';
import { formatTimeRange } from '@/shared/utils/datetime.ts';
import type { ApiResponse } from '@wanderlog/shared';

interface UpcomingEvent {
  id: string;
  title: string;
  category: string;
  startTime: string;
  endTime?: string;
  locationName?: string;
  day: {
    date: string;
    trip: { id: string; title: string; status: string };
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  FLIGHT: 'blue', TRAIN: 'blue', BUS: 'blue', FERRY: 'blue', CAR: 'slate',
  ACCOMMODATION: 'purple', ACTIVITY: 'green', RESTAURANT: 'amber',
  SIGHTSEEING: 'amber', MEETING: 'red', FREE_TIME: 'teal', OTHER: 'slate',
};

function dayLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isThisWeek(d)) return format(d, 'EEEE');
  return format(d, 'EEE, MMM d');
}

export default function CalendarPage() {
  const prefs = usePreferences();
  const { data, isLoading } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: () => api.get<ApiResponse<UpcomingEvent[]>>('/users/me/upcoming'),
  });

  const events = data?.data ?? [];

  // Group by date, then collect consecutive dates into ISO weeks
  const grouped = events.reduce<Record<string, UpcomingEvent[]>>((acc, e) => {
    const key = e.day.date.slice(0, 10);
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  const dateEntries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  const weeks: { week: number; days: [string, UpcomingEvent[]][] }[] = [];
  for (const entry of dateEntries) {
    const w = weekNumber(entry[0]);
    const last = weeks[weeks.length - 1];
    if (last && last.week === w) last.days.push(entry);
    else weeks.push({ week: w, days: [entry] });
  }

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <TopBar title="Calendar" />
      <div className="page-container max-w-3xl">
        <div className="mb-6">
          <p className="section-subtitle">Upcoming events across all your trips — next 90 days</p>
        </div>

        {Object.keys(grouped).length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-8 h-8" />}
            title="No upcoming events"
            description="Events you add to your trip itineraries will appear here."
            action={
              <Link to="/trips" className="btn-primary btn text-sm">
                Go to my trips
              </Link>
            }
          />
        ) : (
          <div className="space-y-8">
            {weeks.map(({ week, days }) => (
              <section key={week}>
                {/* Week header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-xs font-semibold">
                    Week {week}
                  </span>
                  <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                </div>

                <div className="space-y-8">
                  {days.map(([date, dayEvents]) => (
              <div key={date}>
                {/* Day header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn(
                    'w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0',
                    isToday(parseISO(date))
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
                  )}>
                    <span className="text-xs font-medium leading-none">
                      {format(parseISO(date), 'MMM').toUpperCase()}
                    </span>
                    <span className="text-lg font-bold leading-tight">
                      {format(parseISO(date), 'd')}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {dayLabel(date)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatWeekday(date)} · {formatDate(date, prefs)}
                    </p>
                  </div>
                </div>

                {/* Events for this day */}
                <div className="ml-15 pl-6 border-l-2 border-slate-100 dark:border-slate-800 space-y-3">
                  {dayEvents.map((event) => {
                    const colorVariant = (CATEGORY_COLORS[event.category] ?? 'slate') as 'blue' | 'slate' | 'green' | 'amber' | 'red' | 'teal' | 'purple';
                    return (
                      <Link
                        key={event.id}
                        to={`/trips/${event.day.trip.id}/itinerary`}
                        className="card p-4 flex items-start gap-4 hover:shadow-card-md transition-shadow block"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={colorVariant}>
                              {event.category.toLowerCase().replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-slate-400">
                              {event.day.trip.title}
                            </span>
                          </div>
                          <p className="font-medium text-slate-900 dark:text-slate-100 mt-1">
                            {event.title}
                          </p>
                          <div className="flex flex-wrap gap-4 mt-1.5">
                            {event.startTime && (
                              <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                <Clock className="w-3 h-3" />
                                {formatTimeRange(event.startTime, event.endTime)}
                              </span>
                            )}
                            {event.locationName && (
                              <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                <MapPin className="w-3 h-3" />
                                {event.locationName}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
