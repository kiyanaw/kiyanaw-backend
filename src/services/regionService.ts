// DataStore imports removed - now using GraphQL API directly
import Timeout from 'smart-timeout';
import { generateClient } from 'aws-amplify/api';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - generated JS GraphQL
import { listRegions } from '../graphql/queries.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - generated JS GraphQL
import { createRegion as createRegionMutation, updateRegion as updateRegionMutation, deleteRegion as deleteRegionMutation } from '../graphql/mutations.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - generated JS GraphQL
import { getRegion as getRegionQuery } from '../graphql/queries.js';

import { RegionModel } from './adt';
import { showToast } from './toastService';
import { type RegionData } from './adt';
import { 
  type GraphQLClient,
  type ListRegionsResponse,
  type GetRegionResponse,
  type CreateRegionResponse,
  type RegionUpdateInput,
  type PendingSave
} from '../types/shared';

// Create GraphQL client lazily
let client: GraphQLClient | null = null;
const getClient = (): GraphQLClient => {
  if (!client) {
    client = generateClient() as GraphQLClient;
  }
  return client;
};

// For testing: reset the client
export const __resetClient = () => {
  client = null;
};

/**
 * Loads and processes regions for a given transcription.
 * @param transcriptionId The ID of the transcription to load regions for
 * @returns Processed and sorted regions
 */
export const loadRegionsForTranscription = async (transcriptionId: string) => {
  // GraphQL filter: transcriptionId eq
  const { data } = await getClient().graphql({
    query: listRegions,
    variables: {
      filter: { 
        transcriptionId: { eq: transcriptionId },
        _deleted: { ne: true }

      },
      limit: 1000 // arbitrarily high
    }
  }) as ListRegionsResponse;

  const items = data?.listRegions?.items ?? [];

  // Filter out soft-deleted regions (Amplify marks deleted items with _deleted = true)
  // const filtered = items.filter((item: RegionData) => !item._deleted);

  // Sort and map to RegionModel
  const regions = items
    .slice()
    .sort((a: RegionData, b: RegionData) => (a.start > b.start ? 1 : -1))
    .map((r: RegionData) => new RegionModel(r));

  return regions;
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
    } as RegionData;

    const { data } = await getClient().graphql({
      query: createRegionMutation,
      variables: { input },
      authMode: 'iam',
    }) as CreateRegionResponse;

    const created = data?.createRegion;
    return new RegionModel(created);
  } catch (error) {
    // console.error('❌ Failed to create region via API:', error);
    showToast('Failed to create region', 'error');
    throw error;
  }
};

// Debounced save state
const pendingSaves = new Map<string, PendingSave<Partial<RegionData>>>();

/**
 * Updates an existing region using GraphQL API with debouncing and automatic analysis inclusion.
 * This method coordinates with the analysis system to ensure both text and analysis
 * are saved together in a single operation, avoiding duplicate saves.
 * 
 * @param regionId The ID of the region to update
 * @param updates The fields to update (text, translation, start, end, etc.)
 * @param username The username of the user making the update
 * @param debounceMs Debounce time in milliseconds (default: 1.5 seconds)
 * @param store Optional editor store to automatically include analysis when updating text
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateRegion = async (regionId: string, updates: Partial<RegionData>, username: string, debounceMs = 1500, store?: any) => {
  const existingTimeout = pendingSaves.get(regionId);
  if (existingTimeout) {
    Timeout.clear(existingTimeout.timeoutKey);
  }

  // Merge with existing pending updates
  const mergedUpdates = existingTimeout 
    ? { ...existingTimeout.updates, ...updates }
    : updates;

  // Create unique timeout key for this region save
  const timeoutKey = `region-save-${regionId}`;

  // Set up debounced save
  Timeout.set(timeoutKey, async () => {
    try {
      // Get current analysis from store when save actually happens
      const finalUpdates = { ...mergedUpdates };
      
      // Try to include analysis if available, we're updating main text, and store is available
      if (store && typeof store === 'object' && 'getState' in store && updates.regionText !== undefined) {
        try {
          const storeState = (store as { getState: () => { regionById: (id: string) => { regionAnalysis?: string[] } | null | undefined } }).getState();
          const region = storeState.regionById(regionId);
          if (region?.regionAnalysis) {
            finalUpdates.regionAnalysis = region.regionAnalysis;
          }
        } catch {
          // console.warn('Could not access store for analysis, continuing without');
          // Continue with save without analysis
        }
      }

      // Fetch current version to satisfy conflict detection
      const { data: getData } = await getClient().graphql({
        query: getRegionQuery,
        variables: { id: regionId },
      }) as GetRegionResponse;

      const existing = getData?.getRegion;
      if (!existing) {
        // console.error(`Region with ID ${regionId} not found`);
        return;
      }

      // Create input for GraphQL with JSON stringified analysis
      const { regionAnalysis, ...otherUpdates } = finalUpdates;
      const input: RegionUpdateInput = {
        id: regionId,
        _version: existing._version,
        ...otherUpdates,
        dateLastUpdated: `${Date.now()}`,
        userLastUpdated: username,
      };

      // Convert regionAnalysis array to JSON string for GraphQL
      if (regionAnalysis) {
        input.regionAnalysis = JSON.stringify(regionAnalysis);
      }

      await getClient().graphql({
        query: updateRegionMutation,
        variables: { input },
        authMode: 'iam',
      });

      const analysisInfo = finalUpdates.regionAnalysis && finalUpdates.regionAnalysis !== mergedUpdates.regionAnalysis ? ` + analysis` : '';
      // console.log(`✅ Saved region ${regionId}${analysisInfo}`);
      showToast(`Saved region ${regionId.slice(0, 8)}...${analysisInfo}`, 'success');
      
      // Remove from pending saves
      pendingSaves.delete(regionId);
      
    } catch {
      // console.error(`❌ Failed to save region ${regionId}`);
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
  regionAnalysis?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}, username: string, store: any, debounceMs = 3000) => {
  const existingTimeout = pendingSaves.get(regionId);
  if (existingTimeout) {
    Timeout.clear(existingTimeout.timeoutKey);
  }

  // Merge with existing pending updates
  const mergedUpdates = existingTimeout 
    ? { ...existingTimeout.updates, ...updates }
    : updates;

  // Create unique timeout key for this region save with analysis
  const timeoutKey = `region-save-analysis-${regionId}`;

  // Set up debounced save with analysis inclusion
  Timeout.set(timeoutKey, async () => {
    try {
      // Get current analysis from store when save actually happens
      const finalUpdates = { ...mergedUpdates };
      
      // Try to include analysis if available and we're updating main text
      if (updates.regionText !== undefined && store && typeof store === 'object' && 'getState' in store) {
        try {
          const storeState = (store as { getState: () => { regionById: (id: string) => { regionAnalysis?: string[] } | null | undefined } }).getState();
          const region = storeState.regionById(regionId);
          if (region?.regionAnalysis) {
            finalUpdates.regionAnalysis = region.regionAnalysis;
          }
        } catch {
          // console.warn('Could not access store for analysis, continuing without');
          // Continue with save without analysis
        }
      }

      // Fetch current version to satisfy conflict detection
      const { data: getData } = await getClient().graphql({
        query: getRegionQuery,
        variables: { id: regionId },
      }) as GetRegionResponse;

      const existing = getData?.getRegion;
      if (!existing) {
        // console.error(`Region with ID ${regionId} not found`);
        return;
      }

      // Create input for GraphQL with JSON stringified analysis
      const { regionAnalysis, ...otherUpdates } = finalUpdates;
      const input: RegionUpdateInput = {
        id: regionId,
        _version: existing._version,
        ...otherUpdates,
        dateLastUpdated: `${Date.now()}`,
        userLastUpdated: username,
      };

      // Convert regionAnalysis array to JSON string for GraphQL
      if (regionAnalysis) {
        input.regionAnalysis = JSON.stringify(regionAnalysis);
      }

      await getClient().graphql({
        query: updateRegionMutation,
        variables: { input },
        authMode: 'iam',
      });

      const analysisInfo = finalUpdates.regionAnalysis ? ` + analysis` : '';
      // console.log(`✅ Saved region ${regionId}${analysisInfo}`);
      showToast(`Saved region ${regionId.slice(0, 8)}...${analysisInfo}`, 'success');
      
      // Remove from pending saves
      pendingSaves.delete(regionId);
      
    } catch {
      // console.error(`❌ Failed to save region ${regionId}`);
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
    const { data: getData } = await getClient().graphql({
      query: getRegionQuery,
      variables: { id: regionId },
    }) as GetRegionResponse;

    const region = getData?.getRegion;
    if (!region) {
      throw new Error(`Region with ID ${regionId} not found`);
    }

    const input = {
      id: regionId,
      _version: region._version,
    };

    await getClient().graphql({
      query: deleteRegionMutation,
      variables: { input },
      authMode: 'iam',
    });
    
    // console.log(`✅ Deleted region ${regionId}`);
    showToast(`Deleted region ${regionId.slice(0, 8)}...`, 'success');
    
  } catch (error) {
    // console.error(`❌ Failed to delete region ${regionId}:`, error);
    showToast(`Failed to delete region ${regionId.slice(0, 8)}...`, 'error');
    throw error;
  }
};

