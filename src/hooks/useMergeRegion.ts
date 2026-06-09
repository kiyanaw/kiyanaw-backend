import { useCallback } from 'react';
import { MergeRegionUseCase } from '../use-cases/merge-region';
import { services } from '../services';
import { useEditorStore } from '../stores/useEditorStore';

interface MergeRegionArgs {
  survivorId: string;
  absorbedId: string;
  transcriptionId: string;
}

export const useMergeRegion = () => {
  const mergeRegion = useCallback(async ({ survivorId, absorbedId, transcriptionId }: MergeRegionArgs) => {
    const confirmed = window.confirm('Merge this region with the next region?');
    if (!confirmed) return;

    try {
      const user = services.authService.currentUser();
      if (!user) throw new Error('User must be authenticated to merge regions');

      const useCase = new MergeRegionUseCase({
        survivorId,
        absorbedId,
        transcriptionId,
        user,
        services,
        store: useEditorStore.getState(),
      });

      await useCase.execute();
    } catch (error) {
      console.error('Failed to merge regions:', error);
      alert('Failed to merge regions. Please try again.');
    }
  }, []);

  return { mergeRegion };
};
