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
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - generated JS GraphQL
import { 
  onCreateRegion, 
  onUpdateRegion, 
  onDeleteRegion 
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - generated JS GraphQL
} from '../graphql/subscriptions.js';

import { RegionModel } from './adt';
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
    console.error('❌ Failed to create region via API:', error);
    throw error;
  }
};

/**
 * Updates an existing region using GraphQL API immediately (no debouncing).
 * 
 * @param regionId The ID of the region to update
 * @param updates The fields to update (text, translation, start, end, etc.)
 * @param username The username of the user making the update
 * @param version The current version of the region for conflict detection
 */
export const updateRegion = async (regionId: string, updates: Partial<RegionData>, username: string, version: number) => {
  try {
    // Create input for GraphQL using provided version (no pre-save fetch needed)
    const input: RegionUpdateInput = {
      id: regionId,
      _version: version,
      ...updates,
      dateLastUpdated: new Date().toISOString(),
      userLastUpdated: username,
    };

    await getClient().graphql({
      query: updateRegionMutation,
      variables: { input },
      authMode: 'iam',
    });

  } catch (error) {
    console.error(`❌ Failed to save region ${regionId}:`, error);
    
    // Log detailed error information for debugging
    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;
      console.error('Error details:', {
        message: errorObj.message,
        errors: errorObj.errors,
        data: errorObj.data,
        name: errorObj.name,
        code: errorObj.code
      });
    }
    
    throw error;
  }
};

/**
 * Gets a region by ID using GraphQL API.
 * @param regionId The ID of the region to fetch
 * @returns Promise that resolves to the region data or null if not found
 */
export const getRegion = async (regionId: string) => {
  try {
    const { data: getData } = await getClient().graphql({
      query: getRegionQuery,
      variables: { id: regionId },
    }) as GetRegionResponse;

    return getData?.getRegion || null;
  } catch (error) {
    console.error(`Failed to get region ${regionId}:`, error);
    return null;
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
    const region = await getRegion(regionId);
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
    
    console.log(`✅ Deleted region ${regionId}`);
    
  } catch (error) {
    console.error(`❌ Failed to delete region ${regionId}:`, error);
    throw error;
  }
};

export type RegionSubscriptionEvent = {
  mutation: 'CREATE' | 'UPDATE' | 'DELETE';
  region: RegionData;
};

export const subscribeToRegionChanges = (
  transcriptionId: string,
  callback: (event: RegionSubscriptionEvent) => void
): (() => void) => {
  console.log('🔌 Setting up subscriptions for transcriptionId:', transcriptionId);
  
  const client = getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscriptions: any[] = [];

  // Filter to only get regions for this transcription
  const filter = {
    transcriptionId: { eq: transcriptionId }
  };

  try {
    // Subscribe to create events
    const createSub = (client.graphql({
      query: onCreateRegion,
      variables: { filter }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any).subscribe({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: (result: any) => {
        const region = result.data?.onCreateRegion;
        if (region && !region._deleted) {
          callback({
            mutation: 'CREATE',
            region: region as RegionData
          });
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: (error: any) => console.error('Create subscription error:', error)
    });

    // Subscribe to update events  
    const updateSub = (client.graphql({
      query: onUpdateRegion,
      variables: { filter }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any).subscribe({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: (result: any) => {
        const region = result.data?.onUpdateRegion;
        if (region && !region._deleted) {
          callback({
            mutation: 'UPDATE',
            region: region as RegionData
          });
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: (error: any) => console.error('Update subscription error:', error)
    });

    // Subscribe to delete events
    const deleteSub = (client.graphql({
      query: onDeleteRegion,
      variables: { filter }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any).subscribe({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: (result: any) => {
        const region = result.data?.onDeleteRegion;
        if (region) {
          callback({
            mutation: 'DELETE',
            region: region as RegionData
          });
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: (error: any) => console.error('Delete subscription error:', error)
    });

    subscriptions.push(createSub, updateSub, deleteSub);
    console.log('🔌 Subscriptions established for transcriptionId:', transcriptionId);

  } catch (error) {
    console.error('🔌 Failed to establish subscriptions:', error);
  }

  // Return unsubscribe function
  return () => {
    console.log('🔌 Unsubscribing from transcriptionId:', transcriptionId);
    subscriptions.forEach(sub => {
      try {
        sub.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    });
  };
};

