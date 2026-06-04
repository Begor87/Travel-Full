import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';
import { api } from '@/services/api/client.ts';
import { TopBar } from '@/shared/components/layout/TopBar.tsx';
import { Avatar } from '@/shared/components/ui/Avatar.tsx';
import { Badge } from '@/shared/components/ui/Badge.tsx';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner.tsx';
import { EmptyState } from '@/shared/components/ui/EmptyState.tsx';
import type { ApiResponse } from '@wanderlog/shared';

interface Person {
  user: { id: string; name: string; email: string; avatarUrl: string | null };
  trips: { id: string; title: string }[];
  role: string;
}

const ROLE_VARIANT: Record<string, 'blue' | 'slate'> = {
  EDITOR: 'blue',
  VIEWER: 'slate',
  OWNER: 'slate',
};

export default function PeoplePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['all-people'],
    queryFn: () => api.get<ApiResponse<Person[]>>('/users/me/people'),
  });

  const people = data?.data ?? [];

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <TopBar title="People" />
      <div className="page-container">
        <p className="section-subtitle mb-6">
          Everyone you've shared a trip with
        </p>

        {people.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="No travel companions yet"
            description="When you invite people to your trips, they'll appear here."
            action={
              <Link to="/trips" className="btn-primary btn text-sm">
                Go to my trips
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {people.map(({ user, trips, role }) => (
              <div key={user.id} className="card p-5">
                <div className="flex items-start gap-3">
                  <Avatar src={user.avatarUrl} name={user.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    <Badge variant={ROLE_VARIANT[role] ?? 'slate'} className="mt-1.5">
                      {role.charAt(0) + role.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                </div>

                {trips.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Shared trips
                    </p>
                    {trips.slice(0, 3).map((trip) => (
                      <Link
                        key={trip.id}
                        to={`/trips/${trip.id}/people`}
                        className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                      >
                        <span className="truncate">{trip.title}</span>
                        <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 ml-2" />
                      </Link>
                    ))}
                    {trips.length > 3 && (
                      <p className="text-xs text-slate-400">+{trips.length - 3} more</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
