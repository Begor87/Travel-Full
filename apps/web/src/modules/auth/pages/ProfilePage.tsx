import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Camera, Mail, User as UserIcon, Calendar, Map } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { api } from '@/services/api/client.ts';
import { useAuthStore } from '@/store/authStore.ts';
import { TopBar } from '@/shared/components/layout/TopBar.tsx';
import { Button } from '@/shared/components/ui/Button.tsx';
import { Input } from '@/shared/components/ui/Input.tsx';
import { Avatar } from '@/shared/components/ui/Avatar.tsx';
import type { ApiResponse, User } from '@wanderlog/shared';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});
type ProfileInput = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '' },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProfileInput) =>
      api.patch<ApiResponse<User>>('/users/me', data),
    onSuccess: ({ data }) => {
      setUser(data as unknown as User);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setIsEditing(false);
      toast.success('Profile updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!user) return null;

  const prefs = user.preferences as unknown as Record<string, string> | null;

  return (
    <div>
      <TopBar title="Profile" />
      <div className="page-container max-w-2xl">

        {/* Avatar & name */}
        <div className="card p-6 mb-6">
          <div className="flex items-start gap-5">
            <div className="relative">
              <Avatar src={user.avatarUrl} name={user.name} size="xl" />
              <button
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center shadow hover:bg-brand-700 transition-colors"
                title="Change avatar (coming soon)"
                disabled
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-3">
                  <Input
                    label="Display name"
                    error={errors.name?.message}
                    autoFocus
                    {...register('name')}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" variant="primary" size="sm" loading={isSubmitting}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => { setIsEditing(false); reset(); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user.name}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                    <Mail className="w-3.5 h-3.5" />
                    {user.email}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Member since {format(new Date(user.createdAt), 'MMMM yyyy')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setIsEditing(true)}
                    leftIcon={<UserIcon className="w-3.5 h-3.5" />}
                  >
                    Edit name
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="card p-6 mb-6">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Account details</h3>
          <div className="space-y-3">
            {[
              { icon: Mail,     label: 'Email',       value: user.email },
              { icon: Calendar, label: 'Timezone',    value: prefs?.timezone ?? 'UTC' },
              { icon: Map,      label: 'Distance',    value: prefs?.distanceUnit === 'mi' ? 'Miles' : 'Kilometres' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Icon className="w-4 h-4" />
                  {label}
                </span>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Preferences link */}
        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Theme & preferences</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Appearance, notifications, security</p>
          </div>
          <Link to="/settings" className="btn btn-secondary text-sm">
            Go to Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
