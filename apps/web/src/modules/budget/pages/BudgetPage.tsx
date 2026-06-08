import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { Plus, Wallet, Pencil, Trash2, Settings2, Link2 } from 'lucide-react';
import { usePreferences } from '@/shared/hooks/usePreferences.ts';
import { formatDayMonth } from '@/shared/utils/format.ts';
import toast from 'react-hot-toast';
import { api } from '@/services/api/client.ts';
import { itineraryApi } from '@/services/api/itinerary.ts';
import { Button } from '@/shared/components/ui/Button.tsx';
import { Modal } from '@/shared/components/ui/Modal.tsx';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner.tsx';
import { EmptyState } from '@/shared/components/ui/EmptyState.tsx';
import { cn } from '@/shared/utils/cn.ts';
import { formatMoney, type ApiResponse } from '@wanderlog/shared';
import { ExpenseForm, type ExpenseFormValues, type ExpenseDraft } from '../components/ExpenseForm.tsx';
import { BudgetSettingsForm } from '../components/BudgetSettingsForm.tsx';

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  currency: string;
  byCategory: Record<string, number>;
  expenseCount: number;
  eventCostTotal: number;
  usingLiveRates: boolean;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  notes?: string;
  linkedEventId?: string | null;
  paidBy: { id: string; name: string };
}

const CATEGORY_LABELS: Record<string, string> = {
  accommodation: 'Accommodation', transport: 'Transport', food: 'Food',
  activities: 'Activities', shopping: 'Shopping', health: 'Health',
  communication: 'Communication', other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  accommodation: 'bg-violet-500', transport: 'bg-sky-500', food: 'bg-orange-500',
  activities: 'bg-emerald-500', shopping: 'bg-pink-500', health: 'bg-red-500',
  communication: 'bg-indigo-500', other: 'bg-slate-400',
};

export default function BudgetPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const prefs = usePreferences();
  const queryClient = useQueryClient();
  const [expenseModal, setExpenseModal] = useState<{ open: boolean; editing?: Expense }>({ open: false });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['budget-summary', tripId],
    queryFn: () => api.get<ApiResponse<BudgetSummary>>(`/trips/${tripId}/budget/summary`),
    enabled: !!tripId,
  });

  const { data: budgetData } = useQuery({
    queryKey: ['budget', tripId],
    queryFn: () => api.get<ApiResponse<{ totalAmount: number; currency: string } | null>>(`/trips/${tripId}/budget`),
    enabled: !!tripId,
  });

  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', tripId],
    queryFn: () => api.get<ApiResponse<Expense[]>>(`/trips/${tripId}/budget/expenses`),
    enabled: !!tripId,
  });

  // Itinerary — to offer event links and resolve linked-event titles
  const { data: itineraryData } = useQuery({
    queryKey: ['itinerary', tripId],
    queryFn: () => itineraryApi.getItinerary(tripId!),
    enabled: !!tripId,
  });

  const eventOptions = useMemo(() => {
    const days = itineraryData?.data ?? [];
    return days.flatMap((d) =>
      (d.events ?? []).map((e) => ({ id: e.id, title: e.title, dayDate: d.date })),
    );
  }, [itineraryData]);

  const eventTitleById = useMemo(() => {
    const map = new Map<string, string>();
    eventOptions.forEach((e) => map.set(e.id, e.title));
    return map;
  }, [eventOptions]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
    queryClient.invalidateQueries({ queryKey: ['budget-summary', tripId] });
    queryClient.invalidateQueries({ queryKey: ['budget', tripId] });
  };

  const saveBudgetMutation = useMutation({
    mutationFn: (data: { totalAmount: number; currency: string }) =>
      api.put(`/trips/${tripId}/budget`, { ...data, categories: [] }),
    onSuccess: () => { invalidate(); setSettingsOpen(false); toast.success('Budget updated'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const addExpenseMutation = useMutation({
    mutationFn: (data: ExpenseFormValues) => api.post(`/trips/${tripId}/budget/expenses`, data),
    onSuccess: () => { invalidate(); setExpenseModal({ open: false }); toast.success('Expense added'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseFormValues }) =>
      api.patch(`/trips/${tripId}/budget/expenses/${id}`, data),
    onSuccess: () => { invalidate(); setExpenseModal({ open: false }); toast.success('Expense updated'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/trips/${tripId}/budget/expenses/${id}`),
    onSuccess: () => { invalidate(); toast.success('Expense removed'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const summary = summaryData?.data;
  const expenses = expensesData?.data ?? [];
  const currency = summary?.currency ?? prefs.currency;
  const hasBudget = !!budgetData?.data;

  const spentPercent = summary && summary.totalBudget > 0
    ? Math.min(100, Math.round((summary.totalSpent / summary.totalBudget) * 100))
    : 0;

  // Category breakdown sorted by spend
  const categoryBreakdown = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.byCategory)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [summary]);

  if (summaryLoading || expensesLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Budget</h2>
          {summary && (
            <p className="section-subtitle">
              Reporting in {currency}
              {summary.usingLiveRates ? ' · live exchange rates' : ' · estimated rates'}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" leftIcon={<Settings2 className="w-4 h-4" />} onClick={() => setSettingsOpen(true)}>
          {hasBudget ? 'Edit budget' : 'Set budget'}
        </Button>
      </div>

      {/* Budget overview */}
      {summary && summary.totalBudget > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Budget', value: summary.totalBudget, color: 'text-slate-900 dark:text-white' },
              { label: 'Spent', value: summary.totalSpent, color: spentPercent > 90 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white' },
              { label: 'Remaining', value: summary.remaining, color: summary.remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card p-5">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
                <p className={cn('text-2xl font-bold', color)}>{formatMoney(value, currency)}</p>
              </div>
            ))}
          </div>

          {/* Progress + category breakdown */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Spending progress</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">{spentPercent}%</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              {categoryBreakdown.map(([cat, amount]) => (
                <div
                  key={cat}
                  className={cn('h-full', CATEGORY_COLORS[cat] ?? 'bg-slate-400')}
                  style={{ width: `${(amount / summary.totalBudget) * 100}%` }}
                  title={`${CATEGORY_LABELS[cat] ?? cat}: ${formatMoney(amount, currency)}`}
                />
              ))}
            </div>

            {categoryBreakdown.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                {categoryBreakdown.map(([cat, amount]) => (
                  <div key={cat} className="flex items-center gap-1.5 text-xs">
                    <span className={cn('w-2.5 h-2.5 rounded-full', CATEGORY_COLORS[cat] ?? 'bg-slate-400')} />
                    <span className="text-slate-600 dark:text-slate-400">{CATEGORY_LABELS[cat] ?? cat}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{formatMoney(amount, currency)}</span>
                  </div>
                ))}
              </div>
            )}

            {summary.eventCostTotal > 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                Includes {formatMoney(summary.eventCostTotal, currency)} from activity costs in your itinerary.
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="card p-6 text-center">
          <Wallet className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            No budget set yet. Set a total and reporting currency to track spending.
          </p>
          <Button variant="primary" size="sm" onClick={() => setSettingsOpen(true)}>Set budget</Button>
        </div>
      )}

      {/* Expenses list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Expenses</h2>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setExpenseModal({ open: true })}>
            Add expense
          </Button>
        </div>

        {expenses.length === 0 ? (
          <EmptyState
            icon={<Wallet className="w-8 h-8" />}
            title="No expenses yet"
            description="Track your trip spending by adding expenses. They can be in any currency."
            action={
              <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setExpenseModal({ open: true })}>
                Add first expense
              </Button>
            }
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {expenses.map((expense) => {
                const linkedTitle = expense.linkedEventId ? eventTitleById.get(expense.linkedEventId) : undefined;
                return (
                  <div key={expense.id} className="group flex items-center justify-between px-5 py-4 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{expense.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {CATEGORY_LABELS[expense.category.toLowerCase()] ?? expense.category} · {formatDayMonth(expense.date, prefs)} · {expense.paidBy.name}
                        </span>
                        {linkedTitle && (
                          <span className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400">
                            <Link2 className="w-3 h-3" />{linkedTitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {formatMoney(expense.amount, expense.currency)}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setExpenseModal({ open: true, editing: expense })}
                          className="p-1.5 text-slate-400 hover:text-brand-500 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteExpenseMutation.mutate(expense.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Budget settings modal */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Budget settings">
        <BudgetSettingsForm
          initial={budgetData?.data ?? null}
          defaultCurrency={prefs.currency}
          isSubmitting={saveBudgetMutation.isPending}
          onSubmit={(data) => saveBudgetMutation.mutate(data)}
        />
      </Modal>

      {/* Add / edit expense modal */}
      <Modal
        open={expenseModal.open}
        onClose={() => setExpenseModal({ open: false })}
        title={expenseModal.editing ? 'Edit expense' : 'Add expense'}
      >
        <ExpenseForm
          expense={expenseModal.editing as ExpenseDraft | undefined}
          defaultCurrency={currency}
          eventOptions={eventOptions}
          isSubmitting={addExpenseMutation.isPending || updateExpenseMutation.isPending}
          onSubmit={(data) => {
            if (expenseModal.editing) {
              updateExpenseMutation.mutate({ id: expenseModal.editing.id, data });
            } else {
              addExpenseMutation.mutate(data);
            }
          }}
        />
      </Modal>
    </div>
  );
}
