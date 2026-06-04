import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Plus, Map, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { tripsApi } from '@/services/api/trips.ts';
import { Button } from '@/shared/components/ui/Button.tsx';
import { Input } from '@/shared/components/ui/Input.tsx';
import { TopBar } from '@/shared/components/layout/TopBar.tsx';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner.tsx';
import { EmptyState } from '@/shared/components/ui/EmptyState.tsx';
import { Modal } from '@/shared/components/ui/Modal.tsx';
import { TripCard } from '../components/TripCard.tsx';
import { CreateTripForm } from '../components/CreateTripForm.tsx';
import { cn } from '@/shared/utils/cn.ts';
import type { Trip, CreateTripInput } from '@wanderlog/shared';

const STATUS_FILTERS = [
  { value: undefined, label: 'All' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export default function TripsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(searchParams.get('new') === '1');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['trips', statusFilter],
    queryFn: () => tripsApi.list(statusFilter),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateTripInput) => tripsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setIsCreateOpen(false);
      setSearchParams({});
      toast.success('Trip created!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const trips = (data?.data ?? []).filter((t: Trip) =>
    search
      ? t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.destinations?.some((d) => d.name.toLowerCase().includes(search.toLowerCase()))
      : true,
  );

  return (
    <div>
      <TopBar
        title="My Trips"
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateOpen(true)}
          >
            New Trip
          </Button>
        }
      />

      <div className="page-container">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Input
            placeholder="Search trips..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="sm:max-w-xs"
          />

          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={label}
                onClick={() => setStatusFilter(value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  statusFilter === value
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Trip grid */}
        {isLoading ? (
          <PageLoader />
        ) : trips.length === 0 ? (
          <EmptyState
            icon={<Map className="w-8 h-8" />}
            title={search ? 'No trips match your search' : 'No trips yet'}
            description={search ? 'Try a different search term.' : 'Create your first trip to get started.'}
            action={
              !search ? (
                <Button
                  variant="primary"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsCreateOpen(true)}
                >
                  Create trip
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {trips.map((trip: Trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); setSearchParams({}); }}
        title="Create new trip"
        size="lg"
      >
        <CreateTripForm
          onSubmit={(data) => createMutation.mutate(data)}
          isSubmitting={createMutation.isPending}
        />
      </Modal>
    </div>
  );
}
