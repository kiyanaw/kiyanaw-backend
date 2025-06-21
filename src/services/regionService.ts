import { DataStore } from '@aws-amplify/datastore';
import { Region as DSRegion, Transcription as DSTranscription } from '../models';

import { RegionModel } from './adt';

// Simple toast spike - just DOM manipulation for now
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  }, 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
};

/**
 * Loads and processes regions for a given transcription.
 * @param transcriptionId The ID of the transcription to load regions for
 * @returns Processed and sorted regions
 */
export const loadRegionsForTranscription = async (transcriptionId: string) => {
  const rawRegions = await DataStore.query(DSRegion, (r) => r.transcription.id.eq(transcriptionId));
  
  // Process and sort regions by start time
  let regions = rawRegions
    .slice()
    .sort((a, b) => (a.start > b.start ? 1 : -1))
    .map((r) => new RegionModel(r as any));

  return regions
}; 


/**
 * Saves a new region to DataStore.
 * @param transcriptionId The ID of the transcription this region belongs to
 * @param region The region data to save
 * @param username The username of the user creating the region
 * @returns The saved region as a RegionModel
 */
export const createRegion = async (transcriptionId: string, region: {
  id: string;
  start: number;
  end: number;
  isNote?: boolean;
}, username: string) => {

  const transcription = await DataStore.query(DSTranscription, transcriptionId)
  if (!transcription) {
    throw new Error(`Transcription with ID ${transcriptionId} not found`);
  }

  const newRegion = new DSRegion({
    // @ts-ignore - id not in TS type
    id: region.id, 
    start: region.start,
    end: region.end,
    isNote: region.isNote || false, 
    dateLastUpdated: `${Date.now()}`,
    userLastUpdated: username,
    transcription,
  });
  
  const savedRegion = await DataStore.save(newRegion);

  return new RegionModel(savedRegion as any);
};

// Debounced save state
const pendingSaves = new Map<string, {
  updates: any;
  timeout: NodeJS.Timeout;
}>();

/**
 * Updates an existing region in DataStore with debouncing.
 * @param regionId The ID of the region to update
 * @param updates The fields to update
 * @param username The username of the user making the update
 * @param debounceMs Debounce time in milliseconds (default: 1500)
 * @param store Optional editor store to automatically include analysis when updating text
 */
export const updateRegion = async (regionId: string, updates: {
  regionText?: string;
  translation?: string;
  start?: number;
  end?: number;
  isNote?: boolean;
  regionAnalysis?: string;
}, username: string, debounceMs = 1500, store?: any) => {
  // Clear existing timeout for this region
  const existing = pendingSaves.get(regionId);
  if (existing) {
    clearTimeout(existing.timeout);
  }

  // Merge with existing pending updates
  const mergedUpdates = existing 
    ? { ...existing.updates, ...updates }
    : updates;

  // Set up debounced save
  const timeout = setTimeout(async () => {
    try {
      // Get current analysis from store when save actually happens (if store provided and updating text)
      let finalUpdates = { ...mergedUpdates };
      
      if (store && updates.regionText !== undefined) {
        try {
          const region = store.getState().regionById(regionId);
          if (region?.regionAnalysis) {
            finalUpdates.regionAnalysis = JSON.stringify(region.regionAnalysis);
          }
        } catch (storeError) {
          console.warn('Could not access store for analysis, continuing without:', storeError);
          // Continue with save without analysis
        }
      }

      const originalRegion = await DataStore.query(DSRegion, regionId);
      if (!originalRegion) {
        console.error(`Region with ID ${regionId} not found`);
        return;
      }

      await DataStore.save(
        DSRegion.copyOf(originalRegion, (draft) => {
          // Update provided fields
          if (finalUpdates.regionText !== undefined) {
            draft.regionText = finalUpdates.regionText;
          }
          if (finalUpdates.translation !== undefined) {
            draft.translation = finalUpdates.translation;
          }
          if (finalUpdates.start !== undefined) {
            draft.start = finalUpdates.start;
          }
          if (finalUpdates.end !== undefined) {
            draft.end = finalUpdates.end;
          }
          if (finalUpdates.isNote !== undefined) {
            draft.isNote = finalUpdates.isNote;
          }
          if (finalUpdates.regionAnalysis !== undefined) {
            draft.regionAnalysis = finalUpdates.regionAnalysis;
          }
          
          // Always update metadata
          draft.dateLastUpdated = `${Date.now()}`;
          draft.userLastUpdated = username;
        })
      );

      const analysisInfo = finalUpdates.regionAnalysis && finalUpdates.regionAnalysis !== mergedUpdates.regionAnalysis ? ` + analysis` : '';
      console.log(`✅ Saved region ${regionId}${analysisInfo}`);
      showToast(`Saved region ${regionId.slice(0, 8)}...${analysisInfo}`, 'success');
      
      // Remove from pending saves
      pendingSaves.delete(regionId);
      
    } catch (error) {
      console.error(`❌ Failed to save region ${regionId}:`, error);
      showToast(`Failed to save region ${regionId.slice(0, 8)}...`, 'error');
      pendingSaves.delete(regionId);
    }
  }, debounceMs);

  // Store the pending save
  pendingSaves.set(regionId, {
    updates: mergedUpdates,
    timeout
  });
};

/**
 * Updates an existing region in DataStore with debouncing and automatic analysis inclusion.
 * This method coordinates with the analysis system to ensure both text and analysis
 * are saved together in a single operation, avoiding duplicate saves.
 * 
 * @param regionId The ID of the region to update
 * @param updates The fields to update (text, translation, etc.)
 * @param username The username of the user making the update
 * @param store The editor store to get current analysis from
 * @param debounceMs Debounce time in milliseconds (default: 3000)
 */
export const updateRegionWithAnalysis = async (regionId: string, updates: {
  regionText?: string;
  translation?: string;
  start?: number;
  end?: number;
  isNote?: boolean;
}, username: string, store: any, debounceMs = 3000) => {
  // Clear existing timeout for this region
  const existing = pendingSaves.get(regionId);
  if (existing) {
    clearTimeout(existing.timeout);
  }

  // Merge with existing pending updates
  const mergedUpdates = existing 
    ? { ...existing.updates, ...updates }
    : updates;

  // Set up debounced save with analysis inclusion
  const timeout = setTimeout(async () => {
    try {
      // Get current analysis from store when save actually happens
      let finalUpdates = { ...mergedUpdates };
      
      // Try to include analysis if available and we're updating main text
      if (updates.regionText !== undefined) {
        try {
          const region = store.getState().regionById(regionId);
          if (region?.regionAnalysis) {
            finalUpdates.regionAnalysis = JSON.stringify(region.regionAnalysis);
          }
        } catch (storeError) {
          console.warn('Could not access store for analysis, continuing without:', storeError);
          // Continue with save without analysis
        }
      }

      const originalRegion = await DataStore.query(DSRegion, regionId);
      if (!originalRegion) {
        console.error(`Region with ID ${regionId} not found`);
        return;
      }

      await DataStore.save(
        DSRegion.copyOf(originalRegion, (draft) => {
          // Update provided fields
          if (finalUpdates.regionText !== undefined) {
            draft.regionText = finalUpdates.regionText;
          }
          if (finalUpdates.translation !== undefined) {
            draft.translation = finalUpdates.translation;
          }
          if (finalUpdates.start !== undefined) {
            draft.start = finalUpdates.start;
          }
          if (finalUpdates.end !== undefined) {
            draft.end = finalUpdates.end;
          }
          if (finalUpdates.isNote !== undefined) {
            draft.isNote = finalUpdates.isNote;
          }
          if (finalUpdates.regionAnalysis !== undefined) {
            draft.regionAnalysis = finalUpdates.regionAnalysis;
          }
          
          // Always update metadata
          draft.dateLastUpdated = `${Date.now()}`;
          draft.userLastUpdated = username;
        })
      );

      const analysisInfo = finalUpdates.regionAnalysis ? ` + analysis` : '';
      console.log(`✅ Saved region ${regionId}${analysisInfo}`);
      showToast(`Saved region ${regionId.slice(0, 8)}...${analysisInfo}`, 'success');
      
      // Remove from pending saves
      pendingSaves.delete(regionId);
      
    } catch (error) {
      console.error(`❌ Failed to save region ${regionId}:`, error);
      showToast(`Failed to save region ${regionId.slice(0, 8)}...`, 'error');
      pendingSaves.delete(regionId);
    }
  }, debounceMs);

  // Store the pending save
  pendingSaves.set(regionId, {
    updates: mergedUpdates,
    timeout
  });
};

