import { useState } from 'react';
import { format } from 'date-fns';
import { CURRENCIES } from '@wanderlog/shared';
import { Button } from '@/shared/components/ui/Button.tsx';
import { Input } from '@/shared/components/ui/Input.tsx';

export interface ExpenseFormValues {
  title: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  notes?: string;
  linkedEventId?: string | null;
}

export interface ExpenseDraft {
  id?: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  notes?: string;
  linkedEventId?: string | null;
}

interface EventOption {
  id: string;
  title: string;
  dayDate: string;
}

interface ExpenseFormProps {
  onSubmit: (data: ExpenseFormValues) => void;
  isSubmitting: boolean;
  expense?: ExpenseDraft;
  defaultCurrency?: string;
  /** Itinerary events available to link this expense to. */
  eventOptions?: EventOption[];
}

const CATEGORIES = ['accommodation', 'transport', 'food', 'activities', 'shopping', 'health', 'communication', 'other'];

export function ExpenseForm({ onSubmit, isSubmitting, expense, defaultCurrency = 'USD', eventOptions = [] }: ExpenseFormProps) {
  const [form, setForm] = useState({
    title: expense?.title ?? '',
    amount: expense?.amount != null ? String(expense.amount) : '',
    currency: expense?.currency ?? defaultCurrency,
    category: expense?.category?.toLowerCase() ?? 'other',
    date: expense?.date ? expense.date.slice(0, 10) : format(new Date(), 'yyyy-MM-dd'),
    notes: expense?.notes ?? '',
    linkedEventId: expense?.linkedEventId ?? '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title: form.title.trim(),
      amount: parseFloat(form.amount),
      currency: form.currency,
      category: form.category,
      date: form.date,
      notes: form.notes.trim() || undefined,
      linkedEventId: form.linkedEventId || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Description"
        placeholder="e.g. Dinner at Narisawa"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        required
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label">Currency</label>
          <select
            className="input"
            value={form.currency}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Category</label>
          <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          required
        />
      </div>

      {/* Link to an itinerary event */}
      {eventOptions.length > 0 && (
        <div>
          <label className="label">Link to activity (optional)</label>
          <select
            className="input"
            value={form.linkedEventId}
            onChange={(e) => setForm((f) => ({ ...f, linkedEventId: e.target.value }))}
          >
            <option value="">— Not linked —</option>
            {eventOptions.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Linking replaces that activity's own cost so it isn't counted twice.
          </p>
        </div>
      )}

      <div>
        <label className="label">Notes (optional)</label>
        <textarea
          className="input min-h-[60px] resize-none"
          placeholder="Any details..."
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {expense?.id ? 'Save changes' : 'Add expense'}
        </Button>
      </div>
    </form>
  );
}
