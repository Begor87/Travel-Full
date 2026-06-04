import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { createTripSchema, type CreateTripInput } from '@wanderlog/shared';
import { Button } from '@/shared/components/ui/Button.tsx';
import { Input } from '@/shared/components/ui/Input.tsx';

interface CreateTripFormProps {
  onSubmit: (data: CreateTripInput) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<CreateTripInput>;
}

const CATEGORIES = ['leisure', 'business', 'family', 'adventure', 'cultural', 'other'] as const;

export function CreateTripForm({ onSubmit, isSubmitting, defaultValues }: CreateTripFormProps) {
  const { register, control, handleSubmit, formState: { errors } } = useForm<CreateTripInput>({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      category: 'leisure',
      visibility: 'private',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      tags: [],
      destinations: [{ name: '', country: '', countryCode: '', order: 0 }],
      ...defaultValues,
    },
  });

  const { fields: destFields, append: appendDest, remove: removeDest } = useFieldArray({
    control,
    name: 'destinations',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Input
        label="Trip title"
        placeholder="e.g. Summer in Japan"
        error={errors.title?.message}
        {...register('title')}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start date"
          type="date"
          error={errors.startDate?.message}
          {...register('startDate')}
        />
        <Input
          label="End date"
          type="date"
          error={errors.endDate?.message}
          {...register('endDate')}
        />
      </div>

      <div>
        <label className="label">Category</label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => (
            <label key={cat} className="cursor-pointer">
              <input type="radio" value={cat} className="sr-only" {...register('category')} />
              <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-xs font-medium text-slate-600 dark:text-slate-400 hover:border-brand-400 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 dark:has-[:checked]:bg-brand-900/20 has-[:checked]:text-brand-700 dark:has-[:checked]:text-brand-400 transition-all capitalize">
                {cat}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Destinations</label>
          <button
            type="button"
            onClick={() => appendDest({ name: '', country: '', countryCode: '', order: destFields.length })}
            className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add destination
          </button>
        </div>

        <div className="space-y-2">
          {destFields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <Input
                placeholder="City / place"
                {...register(`destinations.${index}.name`)}
                className="flex-1"
              />
              <Input
                placeholder="Country"
                {...register(`destinations.${index}.country`)}
                className="flex-1"
              />
              <Input
                placeholder="CC"
                maxLength={2}
                {...register(`destinations.${index}.countryCode`)}
                className="w-16 uppercase"
              />
              {destFields.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDest(index)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {errors.destinations?.message && (
          <p className="mt-1 text-xs text-red-500">{errors.destinations.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Create trip
        </Button>
      </div>
    </form>
  );
}
