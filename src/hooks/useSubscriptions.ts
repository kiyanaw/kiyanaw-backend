import { useEffect } from 'react';
import { SubscribeToRegionChangesUseCase } from '../use-cases/subscribe-to-region-changes';
import { services } from '../services';

export const useSubscriptions = (transcriptionId: string): void => {
  useEffect(() => {
    if (!transcriptionId) return;

    const useCase = new SubscribeToRegionChangesUseCase({
      transcriptionId,
      services
    });

    const unsubscribe = useCase.execute();

    return () => {
      unsubscribe?.();
    };
  }, [transcriptionId]);
}; 