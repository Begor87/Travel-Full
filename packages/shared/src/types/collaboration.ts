export type CollaboratorRole = 'owner' | 'editor' | 'viewer';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface TripCollaborator {
  id: string;
  tripId: string;
  userId: string;
  role: CollaboratorRole;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface TripInvitation {
  id: string;
  tripId: string;
  email: string;
  role: CollaboratorRole;
  status: InvitationStatus;
  invitedById: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  tripId: string;
  userId: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  entityTitle?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user: {
    name: string;
    avatarUrl?: string;
  };
}

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'invited'
  | 'joined'
  | 'commented'
  | 'uploaded'
  | 'completed';

export type ActivityEntityType =
  | 'trip'
  | 'event'
  | 'document'
  | 'expense'
  | 'comment'
  | 'collaborator';
