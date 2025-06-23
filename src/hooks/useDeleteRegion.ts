import { useCallback } from 'react';
import { DeleteRegion } from '../use-cases/delete-region';
import { services } from '../services';
import { useEditorStore } from '../stores/useEditorStore';

export const useDeleteRegion = () => {
  const store = useEditorStore.getState();
  
  const deleteRegion = useCallback(async (regionId: string) => {
    // Get user confirmation
    const confirmed = window.confirm(
      'Are you sure you want to delete this region? This action cannot be undone.'
    );
    
    if (!confirmed) {
      return;
    }

    try {
      const transcription = store.transcription;
      if (!transcription) {
        throw new Error('No transcription loaded');
      }

      const useCase = new DeleteRegion({
        regionId,
        transcriptionId: transcription.id,
        services,
        store,
      });

      await useCase.execute();
      
    } catch (error) {
      console.error('Failed to delete region:', error);
      // Show user-friendly error message
      alert('Failed to delete region. Please try again.');
    }
  }, [store]);

  return { deleteRegion };
}; 