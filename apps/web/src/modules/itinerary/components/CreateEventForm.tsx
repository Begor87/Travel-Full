import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEventSchema, type CreateEventInput } from '@wanderlog/shared';
import { Button } from '@/shared/components/ui/Button.tsx';
import { Input } from '@/shared/components/ui/Input.tsx';

interface CreateEventFormProps {
  onSubmit: (data: CreateEventInput) => void;
  isSubmitting: boolean;
}

const EVENT_CATEGORIES = [
  'flight', 'train', 'bus', 'ferry', 'car',
  'accommodation', 'activity', 'restaurant',
  'sightseeing', 'meeting', 'free_time', 'other',
] as const;

export function CreateEventForm({ onSubmit, isSubmitting }: CreateEventFormProps) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      category: 'activity',
      status: 'confirmed',
      allDay: false,
      bookingReferences: [],
      checklistItems: [],
    },
  });

  const allDay = watch('allDay');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Event title"
        placeholder="e.g. Flight to Tokyo"
        error={errors.title?.message}
        {...register('title')}
      />

      <div>
        <label className="label">Category</label>
        <select
          className="input"
          {...register('category')}
        >
          {EVENT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" className="w-4 h-4 rounded accent-brand-600" {...register('allDay')} />
        <span className="text-sm text-slate-700 dark:text-slate-300">All day event</span>
      </label>

      {!allDay && (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start time"
            type="datetime-local"
            error={errors.startTime?.message}
            {...register('startTime')}
          />
          <Input
            label="End time"
            type="datetime-local"
            {...register('endTime')}
          />
        </div>
      )}

      <Input
        label="Location (optional)"
        placeholder="Place name or address"
        {...register('location.name')}
      />

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
          Add event
        </Button>
      </div>
    </form>
  );
}
