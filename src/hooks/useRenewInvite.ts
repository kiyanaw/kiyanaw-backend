import { useCallback } from 'react';
import { services } from '../services';
import { useAuthStore } from '../stores/useAuthStore';
import { RenewInviteUseCase, type RenewInviteResult } from '../use-cases/renew-invite';

export const useRenewInvite = () => {
  const user = useAuthStore((state) => state.user);

  const renewInvite = useCallback(async (inviteId: string): Promise<RenewInviteResult> => {
    if (!user) {
      throw new Error('User must be authenticated to renew invitations');
    }

    const useCase = new RenewInviteUseCase({
      inviteId,
      requestorUserId: user.userId,
      services
    });

    return await useCase.execute();
  }, [user]);

  return renewInvite;
};
