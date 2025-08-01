import { useCallback } from 'react';
import { AcceptInviteUseCase, type AcceptInviteResult } from '../use-cases/accept-invite';
import { services } from '../services';
import { useAuthStore } from '../stores/useAuthStore';

/**
 * Pure-callback hook for accepting invites
 * Returns a memoized callback that orchestrates invite acceptance
 */
export const useAcceptInvite = () => {
  const user = useAuthStore((state) => state.user);

  return useCallback(async (inviteId: string): Promise<AcceptInviteResult> => {
    if (!user) {
      throw new Error('User must be authenticated to accept invites');
    }

    const acceptInviteUseCase = new AcceptInviteUseCase({
      inviteId,
      userEmail: user.username, // This is the email from the auth store
      userId: user.userId,
      services
    });

    return await acceptInviteUseCase.execute();
  }, [user]);
}; 