import { useForm } from 'react-hook-form';
import { CURRENCIES, type CreateEventInput, type ItineraryEvent } from '@wanderlog/shared';
import { Button } from '@/shared/components/ui/Button.tsx';
import { Input } from '@/shared/components/ui/Input.tsx';
import { toServerDateTime, toLocalInputValue } from '@/shared/utils/datetime.ts';

interface EventFormProps {
  onSubmit: (data: CreateEventInput) => void;
  isSubmitting: boolean;
  /** When provided, the form is in edit mode and prefills from this event. */
  event?: ItineraryEvent;
  defaultCurrency?: string;
}

const EVENT_CATEGORIES = [
  'flight', 'train', 'bus', 'ferry', 'car',
  'accommodation', 'activity', 'restaurant',
  'sightseeing', 'meeting', 'free_time', 'other',
] as const;

// The raw shape the form fields produce (strings from inputs).
interface FormValues {
  title: string;
  category: string;
  status: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  locationName: string;
  notes: string;
  cost: string;
  costCurrency: string;
}

export function EventForm({ onSubmit, isSubmitting, event, defaultCurrency = 'USD' }: EventFormProps) {
  const isEdit = !!event;

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      title: event?.title ?? '',
      category: (event?.category ?? 'activity').toLowerCase(),
      status: (event?.status ?? 'confirmed').toLowerCase(),
      allDay: event?.allDay ?? false,
      startTime: toLocalInputValue(event?.startTime),
      endTime: toLocalInputValue(event?.endTime),
      locationName: event?.location?.name ?? '',
      notes: event?.notes ?? '',
      cost: event?.cost != null ? String(event.cost) : '',
      costCurrency: event?.costCurrency ?? defaultCurrency,
    },
  });

  const allDay = watch('allDay');
  const costValue = watch('cost');

  const submit = (values: FormValues) => {
    const parsedCost = values.cost.trim() === '' ? undefined : Number(values.cost);

    const payload: CreateEventInput = {
      title: values.title.trim(),
      category: values.category as CreateEventInput['category'],
      status: values.status as CreateEventInput['status'],
      allDay: values.allDay,
      startTime: values.allDay ? undefined : toServerDateTime(values.startTime),
      endTime: values.allDay ? undefined : toServerDateTime(values.endTime),
      notes: values.notes.trim() || undefined,
      // Only include location when a name was actually entered (schema requires min length)
      location: values.locationName.trim() ? { name: values.locationName.trim() } : undefined,
      cost: parsedCost != null && !Number.isNaN(parsedCost) ? parsedCost : undefined,
      costCurrency: parsedCost != null && !Number.isNaN(parsedCost) ? values.costCurrency : undefined,
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <Input
        label="Event title"
        placeholder="e.g. Flight to Tokyo"
        error={errors.title?.message}
        {...register('title', { required: 'Title is required' })}
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Category</label>
          <select className="input" {...register('category')}>
            {EVENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" {...register('status')}>
            <option value="confirmed">Confirmed</option>
            <option value="tentative">Tentative</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" className="w-4 h-4 rounded accent-brand-600" {...register('allDay')} />
        <span className="text-sm text-slate-700 dark:text-slate-300">All day event</span>
      </label>

      {!allDay && (
        <div className="grid grid-cols-2 gap-4">
          <Input label="Start time" type="datetime-local" error={errors.startTime?.message} {...register('startTime')} />
          <Input label="End time" type="datetime-local" {...register('endTime')} />
        </div>
      )}

      <Input
        label="Location (optional)"
        placeholder="Place name or address"
        {...register('locationName')}
      />

      {/* Cost — flows into the trip budget automatically */}
      <div>
        <label className="label">Cost (optional)</label>
        <div className="flex gap-2">
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="flex-1"
            {...register('cost')}
          />
          <select className="input w-28" {...register('costCurrency')} disabled={!costValue}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code}</option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Added to the trip budget automatically, converted to your reporting currency.
        </p>
      </div>

      <div>
        <label className="label">Notes (optional)</label>
        <textarea
          className="input min-h-[80px] resize-none"
          placeholder="Additional notes, instructions..."
          {...register('notes')}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {isEdit ? 'Save changes' : 'Add event'}
        </Button>
      </div>
    </form>
  );
}
