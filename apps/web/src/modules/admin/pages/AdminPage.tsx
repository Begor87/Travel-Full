import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, KeyRound, RefreshCw, Ban, CheckCircle2, Trash2, Crown, User as UserIcon, Copy } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { adminApi, type AdminUser } from '@/services/api/admin.ts';
import { useAuthStore } from '@/store/authStore.ts';
import { TopBar } from '@/shared/components/layout/TopBar.tsx';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner.tsx';
import { Button } from '@/shared/components/ui/Button.tsx';
import { Badge } from '@/shared/components/ui/Badge.tsx';
import { Avatar } from '@/shared/components/ui/Avatar.tsx';
import { Modal } from '@/shared/components/ui/Modal.tsx';

function copy(text: string) {
  navigator.clipboard?.writeText(text).then(
    () => toast.success('Copied'),
    () => toast.error('Could not copy'),
  );
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [resetResult, setResetResult] = useState<{ name: string; password: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers(),
  });

  const { data: codeData } = useQuery({
    queryKey: ['signup-code'],
    queryFn: () => adminApi.getSignupCode(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { role?: 'USER' | 'ADMIN'; isActive?: boolean } }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => { invalidate(); toast.success('User updated'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMutation = useMutation({
    mutationFn: (user: AdminUser) => adminApi.resetPassword(user.id).then((r) => ({ user, r })),
    onSuccess: ({ user, r }) => {
      invalidate();
      setResetResult({ name: user.name, password: r.data.tempPassword });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => { invalidate(); setConfirmDelete(null); toast.success('User deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const regenMutation = useMutation({
    mutationFn: () => adminApi.regenerateSignupCode(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['signup-code'] }); toast.success('New access code generated'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const users = usersData?.data ?? [];
  const code = codeData?.data?.code;

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <TopBar title="Admin" />
      <div className="page-container max-w-4xl space-y-6">

        {/* Signup access code */}
        <section className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <KeyRound className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Signup access code</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            New users must enter this code to register. Share it with people you invite; regenerate it to revoke access for anyone who hasn't signed up yet.
          </p>
          <div className="flex items-center gap-3">
            <code className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-lg tracking-widest text-slate-900 dark:text-slate-100">
              {code ?? '— none —'}
            </code>
            {code && (
              <Button variant="ghost" size="icon" onClick={() => copy(code)} title="Copy">
                <Copy className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              loading={regenMutation.isPending}
              onClick={() => {
                if (confirm('Generate a new code? The current code will stop working immediately.')) {
                  regenMutation.mutate();
                }
              }}
            >
              Regenerate
            </Button>
          </div>
        </section>

        {/* Users */}
        <section className="card overflow-hidden">
          <div className="flex items-center gap-3 p-6 pb-4">
            <ShieldCheck className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Users</h2>
            <span className="text-xs text-slate-400">({users.length})</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((u) => {
              const isSelf = u.id === currentUser?.id;
              const isAdmin = u.role === 'ADMIN';
              return (
                <div key={u.id} className="flex items-center gap-3 px-6 py-4 flex-wrap">
                  <Avatar src={u.avatarUrl} name={u.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{u.name}</p>
                      {isSelf && <span className="text-xs text-slate-400">(you)</span>}
                      {isAdmin && <Badge variant="amber"><Crown className="w-3 h-3 mr-1" />Admin</Badge>}
                      {!u.isActive && <Badge variant="red">Blocked</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {u.email} · {u._count.ownedTrips} trips · joined {format(new Date(u.createdAt), 'dd.MM.yyyy')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="sm"
                      leftIcon={<KeyRound className="w-3.5 h-3.5" />}
                      loading={resetMutation.isPending && resetMutation.variables?.id === u.id}
                      onClick={() => resetMutation.mutate(u)}
                      title="Reset password"
                    >
                      Reset
                    </Button>

                    {!isSelf && (
                      <Button
                        variant="ghost" size="sm"
                        leftIcon={isAdmin ? <UserIcon className="w-3.5 h-3.5" /> : <Crown className="w-3.5 h-3.5" />}
                        onClick={() => updateMutation.mutate({ id: u.id, data: { role: isAdmin ? 'USER' : 'ADMIN' } })}
                        title={isAdmin ? 'Demote to user' : 'Promote to admin'}
                      >
                        {isAdmin ? 'Demote' : 'Make admin'}
                      </Button>
                    )}

                    {!isSelf && (
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => updateMutation.mutate({ id: u.id, data: { isActive: !u.isActive } })}
                        title={u.isActive ? 'Block' : 'Unblock'}
                        className={u.isActive ? 'text-amber-500' : 'text-emerald-500'}
                      >
                        {u.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </Button>
                    )}

                    {!isSelf && (
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => setConfirmDelete(u)}
                        title="Delete"
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Reset password result */}
      <Modal
        open={!!resetResult}
        onClose={() => setResetResult(null)}
        title="Temporary password"
        description={`Share this with ${resetResult?.name}. It replaces their old password and signs them out everywhere.`}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <code className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-lg text-center tracking-wider text-slate-900 dark:text-slate-100">
              {resetResult?.password}
            </code>
            <Button variant="outline" size="icon" onClick={() => resetResult && copy(resetResult.password)}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            They should sign in with this and change it from Settings → Security. This is the only time it's shown.
          </p>
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setResetResult(null)}>Done</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete user?"
        description={`This permanently deletes ${confirmDelete?.name} (${confirmDelete?.email}) and all data they own. This cannot be undone.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" loading={deleteMutation.isPending} onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}>
              Delete permanently
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Consider blocking instead if you only want to suspend access.
        </p>
      </Modal>
    </div>
  );
}
