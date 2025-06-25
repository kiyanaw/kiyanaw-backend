import { useRef } from 'react';
import { UpdateTranscriptionUseCase } from '../use-cases/update-transcription';
import { services } from '../services';
import { useEditorStore } from '../stores/useEditorStore';
import { useAuth } from './useAuth';

export const useUpdateTranscription = (transcriptionId: string) => {
  const lastCalled = useRef<string>();
  const { user } = useAuth();

  return (updates: { title?: string; comments?: string }) => {
    const cacheKey = `${transcriptionId}-${JSON.stringify(updates)}`;
    
    if (lastCalled.current !== cacheKey) {
      lastCalled.current = cacheKey;
      
      if (!user?.username) {
        throw new Error('User must be authenticated to update transcription');
      }

      const store = useEditorStore.getState();
      
      new UpdateTranscriptionUseCase({
        transcriptionId,
        updates,
        username: user.username,
        services,
        store,
      }).execute();
    }
  };
}; 