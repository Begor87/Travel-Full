import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { UserPlus, Crown, Edit3, Eye, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/services/api/client.ts';
import { Button } from '@/shared/components/ui/Button.tsx';
import { Input } from '@/shared/components/ui/Input.tsx';
import { Avatar } from '@/shared/components/ui/Avatar.tsx';
import { Badge } from '@/shared/components/ui/Badge.tsx';
import { Modal } from '@/shared/components/ui/Modal.tsx';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner.tsx';
import { useAuthStore } from '@/store/authStore.ts';
import type { ApiResponse, TripCollaborator } from '@wanderlog/shared';

const ROLE_CONFIG = {
  OWNER: { label: 'Owner', icon: Crown, color: 'amber' as const },
  EDITOR: { label: 'Editor', icon: Edit3, color: 'blue' as const },
  VIEWER: { label: 'Viewer', icon: Eye, color: 'slate' as const },
};

export default function CollaboratorsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'EDITOR' | 'VIEWER'>('VIEWER');

  const { data, isLoading } = useQuery({
    queryKey: ['collaborators', tripId],
    queryFn: () => api.get<ApiResponse<TripCollaborator[]>>(`/trips/${tripId}/collaborators`),
    enabled: !!tripId,
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      api.post(`/trips/${tripId}/collaborators/invite`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', tripId] });
      setIsInviteOpen(false);
      setInviteEmail('');
      toast.success('Invitation sent');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/trips/${tripId}/collaborators/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', tripId] });
      toast.success('Collaborator removed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const collaborators = data?.data ?? [];

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Travellers</h2>
          <p className="section-subtitle">{collaborators.length} people on this trip</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<UserPlus className="w-4 h-4" />}
          onClick={() => setIsInviteOpen(true)}
        >
          Invite
        </Button>
      </div>

      <div className="card overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {collaborators.map((collab) => {
            const roleInfo = ROLE_CONFIG[collab.role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.VIEWER;
            const RoleIcon = roleInfo.icon;
            const isSelf = collab.userId === user?.id;
            const isOwner = (collab.role as string) === 'OWNER' || collab.role === 'owner';

            return (
              <div key={collab.id} className="flex items-center gap-4 px-5 py-4">
                <Avatar src={collab.user.avatarUrl} name={collab.user.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {collab.user.name}
                    {isSelf && <span className="ml-1.5 text-xs text-slate-400">(you)</span>}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{collab.user.email}</p>
                </div>
                <Badge variant={roleInfo.color}>
                  <RoleIcon className="w-3 h-3 mr-1" />
                  {roleInfo.label}
                </Badge>
                {!isOwner && !isSelf && (
                  <button
                    onClick={() => removeMutation.mutate(collab.userId)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        open={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite collaborator"
        description="Send an invitation to someone to join this trip."
      >
        <div className="space-y-4">
          <Input
            label="Email address"
            type="email"
            placeholder="traveller@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <div>
            <label className="label">Permission level</label>
            <div className="grid grid-cols-2 gap-2">
              {(['EDITOR', 'VIEWER'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setInviteRole(role)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    inviteRole === role
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{role === 'EDITOR' ? 'Editor' : 'Viewer'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {role === 'EDITOR' ? 'Can edit itinerary and expenses' : 'Can view only'}
                  </p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="primary"
              loading={inviteMutation.isPending}
              onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
              disabled={!inviteEmail}
            >
              Send invitation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
