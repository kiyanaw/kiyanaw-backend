import { useEffect } from 'react';
import { SubscribeToRegionChangesUseCase } from '../use-cases/subscribe-to-region-changes';
import { SubscribeToIssueChangesUseCase } from '../use-cases/subscribe-to-issue-changes';
import { services } from '../services';

export const useSubscriptions = (transcriptionId: string): void => {
  useEffect(() => {
    if (!transcriptionId) return;

    const regionUseCase = new SubscribeToRegionChangesUseCase({
      transcriptionId,
      services
    });

    const issueUseCase = new SubscribeToIssueChangesUseCase({
      transcriptionId,
      services
    });

    const unsubscribeFunctions = [
      regionUseCase.execute(),
      issueUseCase.execute(),
    ].filter(Boolean) as Array<() => void>;

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  }, [transcriptionId]);
}; 