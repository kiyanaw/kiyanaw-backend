import { useCallback } from 'react';
import { services } from '../services';
import { useAuthStore } from '../stores/useAuthStore';
import { RevokeInviteUseCase, type RevokeInviteResult } from '../use-cases/revoke-invite';

/**
 * Hook for revoking invitations
 * 
 * Provides a callback function that can be used to revoke invitations.
 * Only the person who originally sent the invite can revoke it.
 * 
 * @returns A callback function to revoke an invitation
 */
export const useRevokeInvite = () => {
  const user = useAuthStore((state) => state.user);

  const revokeInvite = useCallback(async (inviteId: string): Promise<RevokeInviteResult> => {
    if (!user) {
      throw new Error('User must be authenticated to revoke invitations');
    }

    const revokeInviteUseCase = new RevokeInviteUseCase({
      inviteId,
      requestorUserId: user.userId,
      services
    });

    return await revokeInviteUseCase.execute();
  }, [user]);

  return revokeInvite;
}; 