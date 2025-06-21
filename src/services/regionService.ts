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
 */
export const updateRegion = async (regionId: string, updates: {
  regionText?: string;
  translation?: string;
  start?: number;
  end?: number;
  isNote?: boolean;
  regionAnalysis?: string;
}, username: string, debounceMs = 1500) => {
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
      const originalRegion = await DataStore.query(DSRegion, regionId);
      if (!originalRegion) {
        console.error(`Region with ID ${regionId} not found`);
        return;
      }

      await DataStore.save(
        DSRegion.copyOf(originalRegion, (draft) => {
          // Update provided fields
          if (mergedUpdates.regionText !== undefined) {
            draft.regionText = mergedUpdates.regionText;
          }
          if (mergedUpdates.translation !== undefined) {
            draft.translation = mergedUpdates.translation;
          }
          if (mergedUpdates.start !== undefined) {
            draft.start = mergedUpdates.start;
          }
          if (mergedUpdates.end !== undefined) {
            draft.end = mergedUpdates.end;
          }
          if (mergedUpdates.isNote !== undefined) {
            draft.isNote = mergedUpdates.isNote;
          }
          if (mergedUpdates.regionAnalysis !== undefined) {
            draft.regionAnalysis = mergedUpdates.regionAnalysis;
          }
          
          // Always update metadata
          draft.dateLastUpdated = `${Date.now()}`;
          draft.userLastUpdated = username;
        })
      );

      console.log(`✅ Saved region ${regionId}`);
      // Simple toast spike - just show a temporary message
      showToast(`Saved region ${regionId.slice(0, 8)}...`, 'success');
      
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

