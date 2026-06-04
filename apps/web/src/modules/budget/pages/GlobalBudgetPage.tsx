import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Wallet, ArrowRight, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/services/api/client.ts';
import { TopBar } from '@/shared/components/layout/TopBar.tsx';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner.tsx';
import { EmptyState } from '@/shared/components/ui/EmptyState.tsx';
import { Badge } from '@/shared/components/ui/Badge.tsx';
import { cn } from '@/shared/utils/cn.ts';
import type { ApiResponse } from '@wanderlog/shared';

interface TripBudget {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  destinations: { name: string }[];
  budget: { totalAmount: number; currency: string } | null;
  totalSpent: number;
  _count: { expenses: number };
}

function SpendBar({ spent, total }: { spent: number; total: number }) {
  if (!total) return null;
  const pct = Math.min(100, Math.round((spent / total) * 100));
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
        <span>{pct}% spent</span>
        <span>{total > 0 ? `${(total - spent).toLocaleString()} remaining` : ''}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function GlobalBudgetPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['all-budgets'],
    queryFn: () => api.get<ApiResponse<TripBudget[]>>('/users/me/budgets'),
  });

  const trips = data?.data ?? [];

  const totalBudgeted = trips.reduce((s, t) => s + (t.budget?.totalAmount ?? 0), 0);
  const totalSpent = trips.reduce((s, t) => s + t.totalSpent, 0);
  const tripsWithBudget = trips.filter((t) => t.budget);

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <TopBar title="Budget" />
      <div className="page-container">

        {/* Summary row */}
        {tripsWithBudget.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Total budgeted', value: `$${totalBudgeted.toLocaleString()}`, sub: `across ${tripsWithBudget.length} trip${tripsWithBudget.length !== 1 ? 's' : ''}` },
              { label: 'Total spent', value: `$${totalSpent.toLocaleString()}`, sub: 'all trips combined' },
              { label: 'Remaining', value: `$${(totalBudgeted - totalSpent).toLocaleString()}`, sub: 'across all trips', green: true },
            ].map(({ label, value, sub, green }) => (
              <div key={label} className="card p-5">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
                <p className={cn('text-2xl font-bold', green ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white')}>{value}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        )}

        {trips.length === 0 ? (
          <EmptyState
            icon={<Wallet className="w-8 h-8" />}
            title="No trips yet"
            description="Create a trip and set a budget to start tracking spending."
            action={<Link to="/trips" className="btn-primary btn text-sm">Go to my trips</Link>}
          />
        ) : (
          <div>
            <h2 className="section-title mb-4">Trip Budgets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {trips.map((trip) => {
                const hasBudget = !!trip.budget;
                const currency = trip.budget?.currency ?? 'USD';
                const total = trip.budget?.totalAmount ?? 0;
                const spent = trip.totalSpent;

                return (
                  <div key={trip.id} className="card p-5 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{trip.title}</p>
                        {trip.destinations[0] && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />{trip.destinations[0].name}
                          </p>
                        )}
                      </div>
                      <Badge variant={['ACTIVE', 'active'].includes(trip.status) ? 'green' : 'blue'}>
                        {trip.status.charAt(0) + trip.status.slice(1).toLowerCase()}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {format(new Date(trip.startDate), 'MMM d')} – {format(new Date(trip.endDate), 'MMM d, yyyy')}
                    </p>

                    {hasBudget ? (
                      <div className="mt-3 flex-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-bold text-slate-900 dark:text-white">
                            {currency} {spent.toLocaleString()}
                          </span>
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            / {total.toLocaleString()}
                          </span>
                        </div>
                        <SpendBar spent={spent} total={total} />
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                          {trip._count.expenses} expense{trip._count.expenses !== 1 ? 's' : ''}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 flex-1">No budget set</p>
                    )}

                    <Link
                      to={`/trips/${trip.id}/budget`}
                      className="mt-4 flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      Manage budget <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
