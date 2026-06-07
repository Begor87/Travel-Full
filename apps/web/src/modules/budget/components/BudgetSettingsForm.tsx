import { useState } from 'react';
import { CURRENCIES, getCurrencyName } from '@wanderlog/shared';
import { Button } from '@/shared/components/ui/Button.tsx';
import { Input } from '@/shared/components/ui/Input.tsx';

interface BudgetSettingsFormProps {
  onSubmit: (data: { totalAmount: number; currency: string }) => void;
  isSubmitting: boolean;
  initial?: { totalAmount: number; currency: string } | null;
}

export function BudgetSettingsForm({ onSubmit, isSubmitting, initial }: BudgetSettingsFormProps) {
  const [totalAmount, setTotalAmount] = useState(initial?.totalAmount != null ? String(initial.totalAmount) : '');
  const [currency, setCurrency] = useState(initial?.currency ?? 'USD');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ totalAmount: parseFloat(totalAmount) || 0, currency });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Reporting currency</label>
        <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.code} — {getCurrencyName(c.code)}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          All expenses are converted to this currency for the budget total, regardless of what currency you logged them in.
        </p>
      </div>

      <Input
        label={`Total budget (${currency})`}
        type="number"
        step="1"
        min="0"
        placeholder="0"
        value={totalAmount}
        onChange={(e) => setTotalAmount(e.target.value)}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" variant="primary" loading={isSubmitting}>Save budget</Button>
      </div>
    </form>
  );
}
