import { useCallback } from 'react';
import { services } from '../services';
import { useAuthStore } from '../stores/useAuthStore';
import { UpdateInvitePermissionUseCase, type UpdateInvitePermissionResult } from '../use-cases/update-invite-permission';

export const useUpdateInvitePermission = () => {
  const user = useAuthStore((state) => state.user);

  const updatePermission = useCallback(async (
    inviteId: string,
    permissionLevel: 'viewer' | 'editor'
  ): Promise<UpdateInvitePermissionResult> => {
    if (!user) {
      throw new Error('User must be authenticated to update invite permissions');
    }

    const useCase = new UpdateInvitePermissionUseCase({
      inviteId,
      requestorUserId: user.userId,
      permissionLevel,
      services
    });

    return await useCase.execute();
  }, [user]);

  return updatePermission;
};
