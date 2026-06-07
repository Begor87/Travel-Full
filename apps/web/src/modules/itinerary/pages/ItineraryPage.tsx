import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { Plus, AlertTriangle, Calendar, Clock, MapPin, Pencil, Trash2, Map as MapIcon } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { itineraryApi } from '@/services/api/itinerary.ts';
import { api } from '@/services/api/client.ts';
import { Button } from '@/shared/components/ui/Button.tsx';
import { Modal } from '@/shared/components/ui/Modal.tsx';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner.tsx';
import { EmptyState } from '@/shared/components/ui/EmptyState.tsx';
import { EventForm } from '../components/EventForm.tsx';
import { DayMap } from '../components/DayMap.tsx';
import { cn } from '@/shared/utils/cn.ts';
import { formatTimeRange } from '@/shared/utils/datetime.ts';
import { formatMoney, type ItineraryDay, type ItineraryEvent, type CreateEventInput, type ApiResponse } from '@wanderlog/shared';

const EVENT_CATEGORY_COLORS: Record<string, string> = {
  flight: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  train: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  bus: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  ferry: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  car: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  accommodation: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  activity: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  restaurant: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  sightseeing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  meeting: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  free_time: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  other: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

function categoryColor(category: string): string {
  return EVENT_CATEGORY_COLORS[category.toLowerCase()] ?? EVENT_CATEGORY_COLORS.other;
}

interface EventCardProps {
  event: ItineraryEvent;
  onEdit: (event: ItineraryEvent) => void;
  onDelete: (id: string) => void;
}

function EventCard({ event, onEdit, onDelete }: EventCardProps) {
  const category = event.category.toLowerCase();
  const cancelled = (event.status as string).toLowerCase() === 'cancelled';

  return (
    <div className={cn(
      'group flex gap-3 p-3 rounded-xl border transition-shadow',
      cancelled
        ? 'opacity-50 border-dashed border-slate-200 dark:border-slate-700'
        : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-card-md',
    )}>
      <div className="flex-shrink-0 mt-0.5">
        <span className={cn('badge text-xs', categoryColor(category))}>
          {category.replace('_', ' ')}
        </span>
      </div>

      <button onClick={() => onEdit(event)} className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{event.title}</p>

        <div className="flex flex-wrap items-center gap-3 mt-1">
          {event.startTime && (
            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="w-3 h-3" />
              {formatTimeRange(event.startTime, event.endTime)}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {event.location.name}
            </span>
          )}
          {event.cost != null && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {formatMoney(event.cost, event.costCurrency ?? 'USD')}
            </span>
          )}
        </div>

        {event.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
            {event.description}
          </p>
        )}

        {(event.bookingReferences?.length ?? 0) > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {event.bookingReferences?.map((ref) => (
              <span key={ref.id} className="badge-slate text-xs">
                {ref.provider}: {ref.reference}
              </span>
            ))}
          </div>
        )}
      </button>

      <div className="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(event)}
          className="text-slate-400 hover:text-brand-500 transition-colors p-1"
          title="Edit event"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(event.id)}
          className="text-slate-400 hover:text-red-500 transition-colors p-1"
          title="Delete event"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

interface DayColumnProps {
  day: ItineraryDay;
  onAddEvent: (dayId: string) => void;
  onEditEvent: (event: ItineraryEvent) => void;
  onDeleteEvent: (eventId: string) => void;
}

function DayColumn({ day, onAddEvent, onEditEvent, onDeleteEvent }: DayColumnProps) {
  const events = day.events ?? [];

  return (
    <div className="min-w-[280px] w-[280px] sm:min-w-0 sm:w-auto">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
            {format(new Date(day.date), 'EEE, MMM d')}
          </p>
          {day.title && <p className="text-xs text-slate-500 dark:text-slate-400">{day.title}</p>}
        </div>
        <Button variant="ghost" size="icon" onClick={() => onAddEvent(day.id)} title="Add event">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {events.length === 0 ? (
          <button
            onClick={() => onAddEvent(day.id)}
            className="w-full py-8 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-sm text-slate-400 hover:border-brand-300 hover:text-brand-500 transition-all"
          >
            + Add event
          </button>
        ) : (
          events.map((event) => (
            <EventCard key={event.id} event={event} onEdit={onEditEvent} onDelete={onDeleteEvent} />
          ))
        )}
      </div>
    </div>
  );
}

export default function ItineraryPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const queryClient = useQueryClient();
  const [addingToDayId, setAddingToDayId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<ItineraryEvent | null>(null);
  const [showMap, setShowMap] = useState(false);

  const { data: itineraryData, isLoading } = useQuery({
    queryKey: ['itinerary', tripId],
    queryFn: () => itineraryApi.getItinerary(tripId!),
    enabled: !!tripId,
  });

  const { data: conflictsData } = useQuery({
    queryKey: ['itinerary-conflicts', tripId],
    queryFn: () => itineraryApi.getConflicts(tripId!),
    enabled: !!tripId,
  });

  // Budget gives us the reporting currency to default new event costs to
  const { data: budgetData } = useQuery({
    queryKey: ['budget', tripId],
    queryFn: () => api.get<ApiResponse<{ currency: string } | null>>(`/trips/${tripId}/budget`),
    enabled: !!tripId,
  });
  const reportingCurrency = budgetData?.data?.currency ?? 'USD';

  // Trip destinations give the map geocoding context (e.g. "Paris, France")
  const { data: tripData } = useQuery({
    queryKey: ['trips', tripId],
    queryFn: () => api.get<ApiResponse<{ destinations: { name: string; country: string }[] }>>(`/trips/${tripId}`),
    enabled: !!tripId,
  });
  const firstDest = tripData?.data?.destinations?.[0];
  const geocodeContext = firstDest ? `${firstDest.name}, ${firstDest.country}` : undefined;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
    queryClient.invalidateQueries({ queryKey: ['itinerary-conflicts', tripId] });
    queryClient.invalidateQueries({ queryKey: ['budget-summary', tripId] });
  };

  const createEventMutation = useMutation({
    mutationFn: ({ dayId, data }: { dayId: string; data: CreateEventInput }) =>
      itineraryApi.createEvent(tripId!, dayId, data),
    onSuccess: () => { invalidate(); setAddingToDayId(null); toast.success('Event added'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: CreateEventInput }) =>
      itineraryApi.updateEvent(tripId!, eventId, data),
    onSuccess: () => { invalidate(); setEditingEvent(null); toast.success('Event updated'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteEventMutation = useMutation({
    mutationFn: (eventId: string) => itineraryApi.deleteEvent(tripId!, eventId),
    onSuccess: () => { invalidate(); toast.success('Event removed'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const days = itineraryData?.data ?? [];
  const conflicts = conflictsData?.data ?? [];

  if (isLoading) return <PageLoader />;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-end mb-4">
        <Button
          variant={showMap ? 'primary' : 'outline'}
          size="sm"
          leftIcon={<MapIcon className="w-4 h-4" />}
          onClick={() => setShowMap((s) => !s)}
        >
          {showMap ? 'Hide map' : 'Show map'}
        </Button>
      </div>

      {/* Map */}
      {showMap && days.length > 0 && (
        <div className="mb-6">
          <DayMap days={days} geocodeContext={geocodeContext} />
        </div>
      )}

      {/* Conflict alerts */}
      {conflicts.length > 0 && (
        <div className="mb-4 card p-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-amber-800 dark:text-amber-300">
                {conflicts.length} schedule issue{conflicts.length !== 1 ? 's' : ''} detected
              </p>
              <div className="mt-1 space-y-1">
                {conflicts.slice(0, 3).map((c, i) => (
                  <p key={i} className="text-xs text-amber-700 dark:text-amber-400">{c.message}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {days.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-8 h-8" />}
          title="No itinerary yet"
          description="Your itinerary days will appear here once the trip has been set up. Add events to start planning."
        />
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-4 pb-4 sm:grid sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {days.map((day) => (
              <DayColumn
                key={day.id}
                day={day}
                onAddEvent={(dayId) => setAddingToDayId(dayId)}
                onEditEvent={(event) => setEditingEvent(event)}
                onDeleteEvent={(eventId) => deleteEventMutation.mutate(eventId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add event modal */}
      <Modal open={!!addingToDayId} onClose={() => setAddingToDayId(null)} title="Add event" size="lg">
        {addingToDayId && (
          <EventForm
            onSubmit={(data) => createEventMutation.mutate({ dayId: addingToDayId, data })}
            isSubmitting={createEventMutation.isPending}
            defaultCurrency={reportingCurrency}
          />
        )}
      </Modal>

      {/* Edit event modal */}
      <Modal open={!!editingEvent} onClose={() => setEditingEvent(null)} title="Edit event" size="lg">
        {editingEvent && (
          <EventForm
            event={editingEvent}
            onSubmit={(data) => updateEventMutation.mutate({ eventId: editingEvent.id, data })}
            isSubmitting={updateEventMutation.isPending}
            defaultCurrency={reportingCurrency}
          />
        )}
      </Modal>
    </div>
  );
}
