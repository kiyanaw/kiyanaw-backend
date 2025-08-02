import { useEffect } from 'react';
import { SubscribeToRegionChangesUseCase } from '../use-cases/subscribe-to-region-changes';
import { services } from '../services';
import { useEditorStore } from '../stores/useEditorStore';

export const useSubscriptions = (transcriptionId: string): void => {
  useEffect(() => {
    if (!transcriptionId) return;

    const store = useEditorStore.getState();
    const useCase = new SubscribeToRegionChangesUseCase({
      transcriptionId,
      services,
      store
    });

    const unsubscribe = useCase.execute();

    return () => {
      unsubscribe?.();
    };
  }, [transcriptionId]);
}; 