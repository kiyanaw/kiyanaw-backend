import { useCallback } from 'react';
import { services } from '../services';
import { CreateInviteUseCase } from '../use-cases/create-invite';
import { useAuthStore } from '../stores/useAuthStore';
import { useEditorStore } from '../stores/useEditorStore';

export interface CreateInviteData {
  email: string;
  permissionLevel: 'viewer' | 'editor';
  transcriptionId: string;
}

export const useCreateInvite = () => {
  return useCallback(async (data: CreateInviteData): Promise<{ messageId: string; inviteId: string }> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      throw new Error('User must be authenticated to create invites');
    }

    const transcription = useEditorStore.getState().transcription;
    if (!transcription) {
      throw new Error('No transcription loaded');
    }

    const useCase = new CreateInviteUseCase({
      email: data.email,
      permissionLevel: data.permissionLevel,
      transcriptionId: data.transcriptionId,
      transcriptionTitle: transcription.title,
      invitedBy: user.userId,
      invitedByFriendly: user.username,
      services,
    });

    const result = await useCase.execute();
    return result;
  }, []);
}; 