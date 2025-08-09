import { useRef } from 'react';
import { UpdateTranscriptionUseCase } from '../use-cases/update-transcription';
import { services } from '../services';
import { useEditorStore } from '../stores/useEditorStore';
import { useAuthStore } from '../stores/useAuthStore';

export const useUpdateTranscription = (transcriptionId: string) => {
  const lastCalled = useRef<string>();
  const user = useAuthStore((state) => state.user);

  return (updates: { title?: string; comments?: string; isPrivate?: boolean; index?: string }) => {
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
        services,
        store,
      }).execute();
    }
  };
}; 