// DataStore imports removed - now using GraphQL API directly
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
  type RegionUpdateInput
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
      dateLastUpdated: new Date().toISOString(),
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

/**
 * Updates an existing region using GraphQL API immediately (no debouncing).
 * 
 * @param regionId The ID of the region to update
 * @param updates The fields to update (text, translation, start, end, etc.)
 * @param username The username of the user making the update
 */
export const updateRegion = async (regionId: string, updates: Partial<RegionData>, username: string) => {
  try {
    // Fetch current version to satisfy conflict detection
    const { data: getData } = await getClient().graphql({
      query: getRegionQuery,
      variables: { id: regionId },
    }) as GetRegionResponse;

    const existing = getData?.getRegion;
    if (!existing) {
      throw new Error(`Region with ID ${regionId} not found`);
    }

    // Create input for GraphQL
    const input: RegionUpdateInput = {
      id: regionId,
      _version: existing._version,
      ...updates,
      dateLastUpdated: new Date().toISOString(),
      userLastUpdated: username,
    };

    await getClient().graphql({
      query: updateRegionMutation,
      variables: { input },
      authMode: 'iam',
    });

    const analysisInfo = updates.regionAnalysis ? ` + analysis` : '';
    console.log(`✅ Saved region ${regionId}${analysisInfo}`);
    showToast(`Saved region ${regionId.slice(0, 8)}...${analysisInfo}`, 'success');
    
  } catch (error) {
    console.error(`❌ Failed to save region ${regionId}:`, error);
    showToast(`Failed to save region ${regionId.slice(0, 8)}...`, 'error');
    throw error;
  }
};

/**
 * Deletes a region using GraphQL API.
 * @param regionId The ID of the region to delete
 * @returns Promise that resolves when deletion is complete
 */
export const deleteRegion = async (regionId: string) => {
  try {
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

