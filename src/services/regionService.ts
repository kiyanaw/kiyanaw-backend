// DataStore imports removed - now using GraphQL API directly
import Timeout from 'smart-timeout';
import { generateClient } from 'aws-amplify/api';
// @ts-ignore generated JS GraphQL
import { listRegions } from '../graphql/queries.js';
// @ts-ignore generated JS GraphQL
import { createRegion as createRegionMutation, updateRegion as updateRegionMutation, deleteRegion as deleteRegionMutation } from '../graphql/mutations.js';
// @ts-ignore generated JS GraphQL
import { getRegion as getRegionQuery } from '../graphql/queries.js';

import { RegionModel } from './adt';
import { showToast } from './toastService';

// Create GraphQL client (re-use throughout)
const client = generateClient();

/**
 * Loads and processes regions for a given transcription.
 * @param transcriptionId The ID of the transcription to load regions for
 * @returns Processed and sorted regions
 */
export const loadRegionsForTranscription = async (transcriptionId: string) => {
  try {
    // GraphQL filter: transcriptionId eq
    const { data } = await client.graphql({
      query: listRegions,
      variables: {
        filter: { 
          transcriptionId: { eq: transcriptionId },
          _deleted: { ne: true }

        },
        limit: 1000 // arbitrarily high
      }
    });

    const items = (data as any)?.listRegions?.items ?? [];

    // Filter out soft-deleted regions (Amplify marks deleted items with _deleted = true)
    // const filtered = items.filter((item: any) => !item._deleted);

    // Sort and map to RegionModel
    const regions = items
      .slice()
      .sort((a: any, b: any) => (a.start > b.start ? 1 : -1))
      .map((r: any) => new RegionModel(r));

    return regions;
  } catch (error) {
    console.error('❌ Failed to load regions via API:', error);
    throw error;
  }
}; 


/**
 * Saves a new region using GraphQL API.
 * @param transcriptionId The ID of the transcription this region belongs to
 * @param region The region data to save
 * @param username The username of the user creating the region
 * @returns The saved region as a RegionModel
 */
export const createRegion = async (
  transcriptionId: string,
  region: {
    id: string;
    start: number;
    end: number;
    isNote?: boolean;
  },
  username: string
) => {
  try {
    const input = {
      id: region.id,
      transcriptionId,
      start: region.start,
      end: region.end,
      isNote: region.isNote ?? false,
      dateLastUpdated: `${Date.now()}`,
      userLastUpdated: username,
    } as any;

    const { data } = await client.graphql({
      query: createRegionMutation,
      variables: { input },
      authMode: 'iam',
    });

    const created = (data as any)?.createRegion;
    return new RegionModel(created);
  } catch (error) {
    console.error('❌ Failed to create region via API:', error);
    showToast('Failed to create region', 'error');
    throw error;
  }
};

// Debounced save state
const pendingSaves = new Map<string, {
  updates: any;
  timeoutKey: string;
}>();

/**
 * Updates an existing region using GraphQL API with debouncing.
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
    Timeout.clear(existing.timeoutKey);
  }

  // Merge with existing pending updates
  const mergedUpdates = existing 
    ? { ...existing.updates, ...updates }
    : updates;

  // Create unique timeout key for this region save
  const timeoutKey = `region-save-${regionId}`;

  // Set up debounced save
  Timeout.set(timeoutKey, async () => {
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

      // Fetch current version to satisfy conflict detection
      const { data: getData } = await client.graphql({
        query: getRegionQuery,
        variables: { id: regionId },
      });

      const existing = (getData as any)?.getRegion;
      if (!existing) {
        console.error(`Region with ID ${regionId} not found`);
        return;
      }

      const input: any = {
        id: regionId,
        _version: existing._version,
        ...finalUpdates,
        dateLastUpdated: `${Date.now()}`,
        userLastUpdated: username,
      };

      await client.graphql({
        query: updateRegionMutation,
        variables: { input },
        authMode: 'iam',
      });

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
    timeoutKey
  });
};

/**
 * Updates an existing region using GraphQL API with debouncing and automatic analysis inclusion.
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
    Timeout.clear(existing.timeoutKey);
  }

  // Merge with existing pending updates
  const mergedUpdates = existing 
    ? { ...existing.updates, ...updates }
    : updates;

  // Create unique timeout key for this region save with analysis
  const timeoutKey = `region-save-analysis-${regionId}`;

  // Set up debounced save with analysis inclusion
  Timeout.set(timeoutKey, async () => {
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

      // Fetch current version to satisfy conflict detection
      const { data: getData } = await client.graphql({
        query: getRegionQuery,
        variables: { id: regionId },
      });

      const existing = (getData as any)?.getRegion;
      if (!existing) {
        console.error(`Region with ID ${regionId} not found`);
        return;
      }

      const input: any = {
        id: regionId,
        _version: existing._version,
        ...finalUpdates,
        dateLastUpdated: `${Date.now()}`,
        userLastUpdated: username,
      };

      await client.graphql({
        query: updateRegionMutation,
        variables: { input },
        authMode: 'iam',
      });

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
    timeoutKey
  });
};

/**
 * Deletes a region using GraphQL API.
 * @param regionId The ID of the region to delete
 * @returns Promise that resolves when deletion is complete
 */
export const deleteRegion = async (regionId: string) => {
  try {
    // Clear any pending saves for this region
    const existing = pendingSaves.get(regionId);
    if (existing) {
      Timeout.clear(existing.timeoutKey);
      pendingSaves.delete(regionId);
    }

    // Fetch current version to satisfy conflict detection
    const { data: getData } = await client.graphql({
      query: getRegionQuery,
      variables: { id: regionId },
    });

    const region = (getData as any)?.getRegion;
    if (!region) {
      throw new Error(`Region with ID ${regionId} not found`);
    }

    const input = {
      id: regionId,
      _version: region._version,
    };

    await client.graphql({
      query: deleteRegionMutation,
      variables: { input },
      authMode: 'iam',
    });
    
    console.log(`✅ Deleted region ${regionId}`);
    showToast(`Deleted region ${regionId.slice(0, 8)}...`, 'success');
    
  } catch (error) {
    console.error(`❌ Failed to delete region ${regionId}:`, error);
    showToast(`Failed to delete region ${regionId.slice(0, 8)}...`, 'error');
    throw error;
  }
};

