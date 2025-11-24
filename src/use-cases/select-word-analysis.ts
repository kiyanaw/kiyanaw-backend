import { useEditorStore } from '../stores/useEditorStore';
import { UpdateRegionUseCase } from './update-region';
import { type WordAnalysis } from '../services/adt';
import { services } from '../services';
import { rteService } from '../services/rteService';

/**
 * Select a specific analysis for a word in a region
 * This marks the analysis as user-selected and triggers a save
 */
export async function selectWordAnalysis(
  regionId: string,
  wordIndex: number,
  selectedAnalysis: string
): Promise<void> {
  const state = useEditorStore.getState();
  const region = state.regionById(regionId);
  
  if (!region) {
    throw new Error(`Region ${regionId} not found`);
  }

  if (!region.regionAnalysis || region.regionAnalysis.length === 0) {
    throw new Error(`No analysis data for region ${regionId}`);
  }

  // Find the WordAnalysis entry for this specific word index
  const analysisEntry = region.regionAnalysis[wordIndex];
  
  if (!analysisEntry) {
    throw new Error(`No analysis found at index ${wordIndex} in region ${regionId}`);
  }

  // Check if the selected analysis is valid
  if (!analysisEntry.allAnalysis.includes(selectedAnalysis)) {
    throw new Error(`Selected analysis "${selectedAnalysis}" not found in available analyses`);
  }

  // Create updated analysis entry
  const updatedAnalysis: WordAnalysis = {
    ...analysisEntry,
    analysis: selectedAnalysis,
    source: 'user',
  };

  // Update the regionAnalysis array
  const updatedRegionAnalysis = [...region.regionAnalysis];
  updatedRegionAnalysis[wordIndex] = updatedAnalysis;

  // Update the store and save
  // DO NOT manually trigger highlighting here - it causes React-Quill corruption
  // because we're still in the middle of React's event handling.
  // The highlighting will update naturally on the next:
  // - Keystroke (triggers spell check + highlighting)
  // - Cursor movement (may trigger highlighting)  
  // - Or after the save completes and React finishes re-rendering
  const updateRegionUseCase = new UpdateRegionUseCase({
    regionId,
    changes: { regionAnalysis: updatedRegionAnalysis },
    debounceMs: 0, // No debounce for user-initiated selections
    primaryField: 'regionAnalysis',
    services,
    store: services.storeService
  });

  await updateRegionUseCase.execute();
  
  // DO NOT call highlighting update here - it causes React-Quill corruption
  // The highlighting will update automatically on the next user interaction:
  // - Next keystroke triggers spell check → highlighting update
  // - Moving cursor to another word updates the context bar
  // This is the most stable approach - no manual Quill manipulation during React updates
}

