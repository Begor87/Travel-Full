import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { api } from '@/services/api/client.ts';
import { Button } from '@/shared/components/ui/Button.tsx';
import { Modal } from '@/shared/components/ui/Modal.tsx';
import { Input } from '@/shared/components/ui/Input.tsx';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner.tsx';
import { EmptyState } from '@/shared/components/ui/EmptyState.tsx';
import { cn } from '@/shared/utils/cn.ts';
import type { ApiResponse } from '@wanderlog/shared';

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  currency: string;
  byCategory: Record<string, number>;
  expenseCount: number;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  notes?: string;
  paidBy: { id: string; name: string };
}

export default function BudgetPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const queryClient = useQueryClient();
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['budget-summary', tripId],
    queryFn: () => api.get<ApiResponse<BudgetSummary>>(`/trips/${tripId}/budget/summary`),
    enabled: !!tripId,
  });

  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', tripId],
    queryFn: () => api.get<ApiResponse<Expense[]>>(`/trips/${tripId}/budget/expenses`),
    enabled: !!tripId,
  });

  const addExpenseMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post(`/trips/${tripId}/budget/expenses`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary', tripId] });
      setIsAddExpenseOpen(false);
      toast.success('Expense added');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const summary = summaryData?.data;
  const expenses = expensesData?.data ?? [];

  const spentPercent = summary
    ? Math.min(100, Math.round((summary.totalSpent / summary.totalBudget) * 100))
    : 0;

  if (summaryLoading || expensesLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Budget overview */}
      {summary && summary.totalBudget > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Budget', value: summary.totalBudget, color: 'text-slate-900 dark:text-white' },
            { label: 'Spent', value: summary.totalSpent, color: spentPercent > 90 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white' },
            { label: 'Remaining', value: summary.remaining, color: summary.remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
              <p className={cn('text-2xl font-bold', color)}>
                {summary.currency} {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No budget set yet. Set a budget to track spending.
          </p>
        </div>
      )}

      {/* Spend progress bar */}
      {summary && summary.totalBudget > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Spending progress</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">{spentPercent}%</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                spentPercent > 90 ? 'bg-red-500' : spentPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500',
              )}
              style={{ width: `${spentPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Expenses list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Expenses</h2>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddExpenseOpen(true)}
          >
            Add expense
          </Button>
        </div>

        {expenses.length === 0 ? (
          <EmptyState
            icon={<Wallet className="w-8 h-8" />}
            title="No expenses yet"
            description="Track your trip spending by adding expenses."
            action={
              <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsAddExpenseOpen(true)}>
                Add first expense
              </Button>
            }
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{expense.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {expense.category.toLowerCase().replace('_', ' ')} · {format(new Date(expense.date), 'MMM d')} · {expense.paidBy.name}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 ml-4">
                    {expense.currency} {expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        title="Add expense"
      >
        <AddExpenseForm
          onSubmit={(data) => addExpenseMutation.mutate(data)}
          isSubmitting={addExpenseMutation.isPending}
        />
      </Modal>
    </div>
  );
}

function AddExpenseForm({ onSubmit, isSubmitting }: { onSubmit: (data: Record<string, unknown>) => void; isSubmitting: boolean }) {
  const [form, setForm] = useState({
    title: '',
    amount: '',
    currency: 'USD',
    category: 'other',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...form, amount: parseFloat(form.amount) });
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
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          required
        />
        <div>
          <label className="label">Currency</label>
          <input className="input uppercase" maxLength={3} value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} />
        </div>
      </div>
      <div>
        <label className="label">Category</label>
        <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
          {['accommodation', 'transport', 'food', 'activities', 'shopping', 'health', 'communication', 'other'].map((c) => (
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
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" variant="primary" loading={isSubmitting}>Add expense</Button>
      </div>
    </form>
  );
}
