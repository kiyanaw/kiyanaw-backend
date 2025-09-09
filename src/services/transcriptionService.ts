import { generateClient } from 'aws-amplify/api';
import { getUrl } from 'aws-amplify/storage';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - GraphQL queries are generated as JS files
import { getTranscription, transcriptionsByAuthor } from '../graphql/queries.js';

import { transcriptionsByAuthorDate } from './custom-queries';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - GraphQL mutations are generated as JS files
import { createTranscription as createTranscriptionMutation, updateTranscription as updateTranscriptionMutation, deleteTranscription as deleteTranscriptionMutation } from '../graphql/mutations.js';

import { loadRegionsForTranscription } from './regionService';
import { loadIssuesForTranscription } from './issueService';
import { loadCommentsForTranscription } from './commentService';
import { TranscriptionModel, type TranscriptionData as ADTTranscriptionData } from './adt';
import { currentUser } from './userService';
import { transcriptionStorage } from './transcriptionStorageService';
import { getMyInvites } from './inviteService';

import { 
  type GraphQLClient, 
  type GraphQLResponse, 
  type GetTranscriptionResponse,
  type CreateTranscriptionResponse,
  type UpdateTranscriptionResponse,
  type DeleteTranscriptionResponse,
  type TranscriptionData as SharedTranscriptionData, 
  type LoadTranscriptionResult,
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

export interface CreateTranscriptionData {
  title: string;
  source: string;
  type: string;
  author: string;
  userLastUpdated: string;
  isPrivate?: boolean;
  publicIssues?: boolean;
}

/**
 * Extracts the S3 key from a source URL
 * @param sourceUrl The full S3 URL (e.g., https://bucket.s3.amazonaws.com/public/key.mp3)
 * @returns The S3 key (e.g., key.mp3)
 */
const extractS3KeyFromUrl = (sourceUrl: string): string => {
  try {
    // Extract the path part after the domain, preserving original encoding
    const urlParts = sourceUrl.split('/');
    const publicIndex = urlParts.findIndex(part => part === 'public');
    
    if (publicIndex === -1) {
      // If no 'public' segment found, assume the entire path after domain is the key
      // This handles URLs like https://bucket.s3.amazonaws.com/direct-file.mp3
      const domainIndex = urlParts.findIndex(part => part.includes('s3.amazonaws.com'));
      if (domainIndex === -1) {
        throw new Error('URL does not contain S3 domain');
      }
      const keyParts = urlParts.slice(domainIndex + 1);
      return keyParts.join('/');
    }
    
    // Get everything after 'public/' and join it back together
    const keyParts = urlParts.slice(publicIndex + 1);
    return keyParts.join('/');
  } catch (error) {
    console.error('Failed to extract S3 key from URL:', sourceUrl, error);
    throw new Error(`Invalid source URL format: ${sourceUrl}`);
  }
};

/**
 * Generates a signed URL for any S3 file using Amplify Storage
 * @param sourceUrl The source URL of the file
 * @param fileSuffix Optional suffix to append to the key (e.g., '.json' for peaks files)
 * @returns The signed URL for the file
 */
export const generateSignedUrl = async (sourceUrl: string, fileSuffix: string = ''): Promise<string> => {
  try {
    const fileKey = extractS3KeyFromUrl(sourceUrl);
    const targetKey = `${fileKey}${fileSuffix}`;
    
    console.log(`Generating signed URL for file: ${targetKey}`);
    
    // Determine the path - if the key already starts with 'public/', use it as is
    // Otherwise, prepend 'public/'
    const path = targetKey.startsWith('public/') ? targetKey : `public/${targetKey}`;
    
    const { url } = await getUrl({
      path,
      options: {
        expiresIn: 3600, // 1 hour
        useAccelerateEndpoint: false
      }
    });
    
    return url.toString();
  } catch (error) {
    console.error(`Failed to generate signed URL for file: ${sourceUrl}${fileSuffix}`, error);
    throw new Error(`Failed to generate signed URL for file: ${error}`);
  }
};

/**
 * Generates a signed URL for a peaks file using Amplify Storage
 * @param sourceUrl The source URL of the media file
 * @returns The signed URL for the peaks file
 */
const generateSignedPeaksUrl = async (sourceUrl: string): Promise<string> => {
  return generateSignedUrl(sourceUrl, '.json');
};

/**
 * Fetches peaks data for a given audio/video source with retry logic.
 * @param source The source URL of the media file
 * @param maxRetries Maximum number of retry attempts
 * @param baseDelay Base delay in milliseconds between retries
 * @returns The peaks data array
 */
const fetchPeaksData = async (
  source: string, 
  maxRetries: number = 10, 
  baseDelay: number = 2000
): Promise<number[]> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Generate signed URL for the peaks file
      const signedPeaksUrl = await generateSignedPeaksUrl(source);
      console.log(`Fetching peaks data (attempt ${attempt + 1}/${maxRetries + 1}): ${signedPeaksUrl}`);
      
      const peaksResponse = await fetch(signedPeaksUrl);
      
      if (peaksResponse.ok) {
        const peaksObject = await peaksResponse.json();
        console.log('✅ Peaks data loaded successfully');
        
        // WaveSurfer expects the raw array of peaks, not the wrapper object.
        if (peaksObject && peaksObject.data) {
          return peaksObject.data;
        } else {
          return peaksObject;
        }
      }
      
      // If we get 403/404, the file is likely still being processed
      if (peaksResponse.status === 403 || peaksResponse.status === 404) {
        lastError = new Error(`Peaks file not ready yet (${peaksResponse.status}), will retry...`);
        console.log(`⏳ ${lastError.message}`);
        
        // Don't retry on the last attempt
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(1.5, attempt); // Exponential backoff
          console.log(`⏱️ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      } else {
        // For other errors, fail immediately (don't let it fall through to catch block)
        const error = new Error(`Failed to load peaks data: ${peaksResponse.status} ${peaksResponse.statusText}`);
        throw error;
      }
      
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Attempt ${attempt + 1} failed:`, lastError.message);
      
      // If this is a "failed to load peaks data" error (non-retryable), re-throw immediately
      if (lastError.message.includes('Failed to load peaks data:')) {
        throw lastError;
      }
      
      // Don't retry on the last attempt
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(1.5, attempt); // Exponential backoff
        console.log(`⏱️ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  // If we've exhausted all retries
  throw new Error(`Failed to load peaks data after ${maxRetries + 1} attempts. The audio file may still be processing. Please try again in a few minutes. Last error: ${lastError?.message}`);
};

/**
 * Fetches all necessary data for the editor page.
 *
 * @param transcriptionId The ID of the transcription to load.
 * @returns An object containing the transcription, regions, and issues, or false if access denied.
 */
export const loadInFull = async (transcriptionId: string): Promise<false | LoadTranscriptionResult> => {
  if (!transcriptionId) {
    throw new Error('transcriptionId is required');
  }

  // Load via GraphQL API (this will enforce authorization)
  let transcriptionData: SharedTranscriptionData;
  try {
    console.log('🔍 Loading transcription via GraphQL API...');
    const graphqlResult = await getClient().graphql({
      query: getTranscription,
      variables: { id: transcriptionId }
    });
    
    const response = graphqlResult as GraphQLResponse<GetTranscriptionResponse>;
    transcriptionData = response.data.getTranscription;
    if (!transcriptionData) {
      return false; // Transcription not found
    }
  } catch (error) {
    console.error('❌ GraphQL API query failed - access denied:', error);
    return false; // Return false instead of throwing error
  }

  // Create TranscriptionModel from GraphQL data
  const transcription = new TranscriptionModel(transcriptionData as unknown as ADTTranscriptionData);
  
  // Set access level for the current user
  const user = currentUser();
  transcription.setAccessLevel(user?.userId);

  // Handle missing source
  if (!transcription.source) {
    throw new Error('Transcription source is required to load peaks data');
  }
  
  const peaks = await fetchPeaksData(transcription.source);

  const [regions, issues, comments] = await Promise.all([
    loadRegionsForTranscription(transcriptionId),
    loadIssuesForTranscription(transcriptionId),
    loadCommentsForTranscription(transcriptionId)
  ]);

  return {
    transcription: transcription,
    peaks,
    regions,
    issues,
    comments,
  };
};

/**
 * Loads transcriptions owned by a specific user using GSI
 * @param userId The user ID to query for
 * @returns Array of TranscriptionModel instances owned by the user
 */
const loadOwnedTranscriptions = async (userId: string): Promise<TranscriptionModel[]> => {
  const allTranscriptions: TranscriptionModel[] = [];
  let nextToken: string | undefined;

  try {
    console.log(`🔍 Loading owned transcriptions for user ${userId} via GSI...`);
    
    do {
      const graphqlResult = await getClient().graphql({
        query: transcriptionsByAuthor,
        variables: {
          author: userId,
          limit: 50,
          nextToken
        }
      });

      const response = graphqlResult as { 
        data: { 
          transcriptionsByAuthor: {
            items: SharedTranscriptionData[];
            nextToken?: string;
          }
        } 
      };
      const page = response.data?.transcriptionsByAuthor;
      
      if (page?.items) {
        const user = currentUser();
        const pageModels = page.items.map(item => {
          const model = new TranscriptionModel(item as unknown as ADTTranscriptionData);
          model.setAccessLevel(user?.userId);
          return model;
        });
        
        allTranscriptions.push(...pageModels);
        console.log(`📄 Loaded owned page: ${pageModels.length} transcriptions`);
      }
      
      nextToken = page?.nextToken;
    } while (nextToken);

    console.log(`✅ Owned transcriptions query completed: ${allTranscriptions.length} transcriptions`);
    return allTranscriptions;
  } catch (error) {
    console.error('❌ Failed to load owned transcriptions via GSI:', error);
    // Log the full error details for debugging
    if (error && typeof error === 'object' && 'errors' in error) {
      console.error('GraphQL errors:', error.errors);
      const errors = error.errors as Array<{
        message?: string;
        errorType?: string;
        path?: string[];
        locations?: Array<{ line: number; column: number }>;
      }>;
      errors.forEach((gqlError, index: number) => {
        console.error(`GraphQL Error ${index + 1}:`, {
          message: gqlError.message,
          errorType: gqlError.errorType,
          path: gqlError.path,
          locations: gqlError.locations
        });
      });
    }
    throw new Error(`Failed to load owned transcriptions for user ${userId}: ${error}`);
  }
};

/**
 * Loads transcriptions shared with a user via accepted invites using enhanced Lambda
 * @param userEmail The user's email to query invites for
 * @param sinceTimestamp Optional timestamp for incremental sync
 * @returns Array of TranscriptionModel instances shared with the user
 */
const loadSharedTranscriptions = async (userEmail: string, sinceTimestamp?: string): Promise<TranscriptionModel[]> => {
  try {
    const syncType = sinceTimestamp ? 'incremental' : 'full';
    console.log(`🔍 Loading shared transcriptions for user ${userEmail} via enhanced Lambda (${syncType} sync)...`);
    
    // Single call to enhanced Lambda with transcription data included
    const invitesResponse = await getMyInvites({
      userEmail,
      includeTranscriptionData: true, // Request full transcription data for card rendering
      sinceTimestamp // For incremental sync if provided
    });
    
    const allInvites = invitesResponse.invites || [];
    // Filter for accepted invites that have transcription data
    const acceptedInvitesWithData = allInvites.filter(inviteWithValidation => 
      inviteWithValidation.invite.status === 'accepted' && 
      inviteWithValidation.transcription // Only include if transcription data exists
    );
    
    console.log(`📧 Found ${acceptedInvitesWithData.length} accepted invites with transcription data out of ${allInvites.length} total`);
    
    if (acceptedInvitesWithData.length === 0) {
      console.log('✅ No shared transcriptions found');
      return [];
    }
    
    // Convert to TranscriptionModel instances using the joined data from Lambda
    const sharedTranscriptions: TranscriptionModel[] = [];
    const user = currentUser();
    
    for (const inviteWithValidation of acceptedInvitesWithData) {
      try {
        const { transcription } = inviteWithValidation;
        
        // Type guard to ensure transcription exists
        if (!transcription) {
          console.warn(`⚠️ No transcription data for invite ${inviteWithValidation.invite.id}`);
          continue;
        }
        
        // Create TranscriptionModel from the joined data
        const transcriptionData: ADTTranscriptionData = {
          id: transcription.id,
          title: transcription.title,
          author: transcription.author,
          authorFriendly: transcription.authorFriendly,
          type: transcription.type,
          length: transcription.length,
          coverage: transcription.coverage,
          issueCount: transcription.issueCount,
          regionCount: transcription.regionCount,
          isPrivate: transcription.isPrivate,
          dateLastUpdated: transcription.dateLastUpdated,
          userLastUpdated: transcription.userLastUpdated,
          createdAt: transcription.createdAt,
          updatedAt: transcription.updatedAt,
          // Set default values for fields not included in Lambda response
          issues: 0,
          comments: '',
          source: '',
          lang: '',
          publicIssues: false,
          disableAnalyzer: false,
          editors: [],
          viewers: []
        };
        
        const model = new TranscriptionModel(transcriptionData);
        model.setAccessLevel(user?.userId);
        sharedTranscriptions.push(model);
        
      } catch (error) {
        console.warn(`⚠️ Skipping transcription ${inviteWithValidation.invite.transcriptionId} due to processing error:`, error);
      }
    }
    
    console.log(`✅ Shared transcriptions loaded: ${sharedTranscriptions.length} accessible`);
    return sharedTranscriptions;
    
  } catch (error) {
    console.error('❌ Failed to load shared transcriptions via enhanced Lambda:', error);
    throw new Error(`Failed to load shared transcriptions for user ${userEmail}: ${error}`);
  }
};

/**
 * Loads owned transcriptions updated since a specific date using compound GSI (author + dateLastUpdated)
 * This ensures we only pay for reads of transcriptions the user actually owns
 * @param userId The user ID to filter by
 * @param sinceDate ISO date string to query from
 * @returns Array of TranscriptionModel instances owned by the user and updated since the date
 */
const loadOwnedTranscriptionsSince = async (userId: string, sinceDate: string): Promise<TranscriptionModel[]> => {
  const allTranscriptions: TranscriptionModel[] = [];
  let nextToken: string | undefined;

  try {
    console.log(`🔍 Loading owned transcriptions for user ${userId} since ${sinceDate} via compound GSI...`);
    
    do {
      const graphqlResult = await getClient().graphql({
        query: transcriptionsByAuthorDate,
        variables: {
          author: userId,
          dateLastUpdated: {
            ge: sinceDate // Greater than or equal to the since date
          },
          limit: 50,
          nextToken
        }
      });

      const response = graphqlResult as { 
        data: { 
          transcriptionsByAuthorDate: {
            items: SharedTranscriptionData[];
            nextToken?: string;
          }
        } 
      };
      const page = response.data?.transcriptionsByAuthorDate;
      
      if (page?.items) {
        const user = currentUser();
        const pageModels = page.items.map(item => {
          const model = new TranscriptionModel(item as unknown as ADTTranscriptionData);
          model.setAccessLevel(user?.userId);
          return model;
        });
        
        allTranscriptions.push(...pageModels);
        console.log(`📄 Loaded page: ${pageModels.length} owned transcriptions`);
      }
      
      nextToken = page?.nextToken;
    } while (nextToken);

    console.log(`✅ Compound GSI query completed: ${allTranscriptions.length} owned transcriptions since ${sinceDate}`);
    return allTranscriptions;
  } catch (error) {
    console.error('❌ Failed to load owned transcriptions via compound GSI:', error);
    // Log the full error details for debugging
    if (error && typeof error === 'object' && 'errors' in error) {
      console.error('GraphQL errors:', error.errors);
      const errors = error.errors as Array<{
        message?: string;
        errorType?: string;
        path?: string[];
        locations?: Array<{ line: number; column: number }>;
      }>;
      errors.forEach((gqlError, index: number) => {
        console.error(`GraphQL Error ${index + 1}:`, {
          message: gqlError.message,
          errorType: gqlError.errorType,
          path: gqlError.path,
          locations: gqlError.locations
        });
      });
    }
    throw new Error(`Failed to load owned transcriptions since ${sinceDate}: ${error}`);
  }
};

// Sync state management
let currentSyncOperation: Promise<TranscriptionModel[]> | null = null;

/**
 * Check if a sync operation is currently in progress
 */
export const isSyncing = (): boolean => currentSyncOperation !== null;

/**
 * Get the current sync promise if one is running
 */
export const getCurrentSyncPromise = (): Promise<TranscriptionModel[]> | null => currentSyncOperation;

/**
 * Load transcriptions from cache only (fast operation)
 * @returns Array of cached TranscriptionModel instances
 */
export const loadFromCache = async (): Promise<TranscriptionModel[]> => {
  const user = currentUser();
  if (!user?.userId) {
    throw new Error('User must be authenticated to load from cache');
  }

  try {
    console.log('⚡ Loading transcriptions from cache...');
    const cached = await transcriptionStorage.getAll();
    console.log(`📦 Loaded ${cached.length} transcriptions from cache`);
    return cached;
  } catch (error) {
    console.error('❌ Failed to load from cache:', error);
    return []; // Return empty array if cache fails
  }
};

/**
 * Get cache statistics and sync status
 * @returns Cache stats including count and last sync timestamp
 */
export const getCacheStats = async (): Promise<{ count: number; lastSyncedAt: string | null }> => {
  const user = currentUser();
  if (!user?.userId) {
    return { count: 0, lastSyncedAt: null };
  }

  try {
    const cached = await transcriptionStorage.getAll();
    const lastSyncedAt = await transcriptionStorage.getLastSyncedAt(user.userId);
    
    return {
      count: cached.length,
      lastSyncedAt
    };
  } catch (error) {
    console.error('❌ Failed to get cache stats:', error);
    return { count: 0, lastSyncedAt: null };
  }
};

/**
 * Sync latest changes since a timestamp (or full sync if no timestamp)
 * @param sinceTimestamp Optional timestamp for incremental sync
 * @returns Array of new/updated TranscriptionModel instances
 */
export const syncLatestChanges = async (sinceTimestamp?: string): Promise<TranscriptionModel[]> => {
  const user = currentUser();
  if (!user?.userId) {
    throw new Error('User must be authenticated to sync');
  }

  // Prevent concurrent sync operations
  if (currentSyncOperation) {
    console.log('🔄 Sync already in progress, waiting for completion...');
    return await currentSyncOperation;
  }

  const syncPromise = (async () => {
    try {
      console.log(`🔄 Syncing ${sinceTimestamp ? 'incremental' : 'full'} changes...`);
      
      const syncResult = await performFullSync(sinceTimestamp);
      
      // Store in cache and update sync timestamp
      if (syncResult.length > 0) {
        await transcriptionStorage.storeTranscriptions(syncResult);
      }
      await transcriptionStorage.setLastSyncedAt(user.userId, new Date().toISOString());
      
      console.log(`✅ Sync completed: ${syncResult.length} transcriptions`);
      return syncResult;
      
    } finally {
      currentSyncOperation = null;
    }
  })();

  currentSyncOperation = syncPromise;
  return await syncPromise;
};

/**
 * Loads all transcriptions with intelligent caching and sync
 * First sync is a full sync, subsequent syncs are incremental using GSI
 * @returns Array of TranscriptionModel instances
 */
export const loadAll = async (): Promise<TranscriptionModel[]> => {
  const user = currentUser();
  if (!user?.userId) {
    throw new Error('User must be authenticated to load transcriptions');
  }


  try {
    console.log('🔍 LoadAll: Checking cache and sync status...');
    
    // Check if we need to validate cache (remove orphaned transcriptions)
    const needsValidation = await transcriptionStorage.shouldValidateCache(user.userId);
    if (needsValidation) {
      console.log('🔍 Cache validation needed, checking for orphaned transcriptions...');
      await validateCachedTranscriptions();
      await transcriptionStorage.markCacheValidated(user.userId);
    }
    
    // Always check for latest data, but only sync what's new since last sync
    console.log('🔄 Checking for latest data...');
    
    // Get last sync timestamp
    const lastSyncedAt = await transcriptionStorage.getLastSyncedAt(user.userId);
    
    if (!lastSyncedAt) {
      // First sync - do full sync using hybrid approach (both owned + shared)
      console.log('🆕 First sync - loading all transcriptions and invites...');
      const fullSyncResult = await performFullSync(); // No timestamp = full sync
      
      // Store in cache
      await transcriptionStorage.storeTranscriptions(fullSyncResult);
      await transcriptionStorage.setLastSyncedAt(user.userId, new Date().toISOString());
      
      console.log(`✅ Full sync completed: ${fullSyncResult.length} transcriptions cached`);
      return fullSyncResult;
    } else {
      // Always sync latest changes since last sync timestamp
      console.log(`🔄 Syncing latest changes since ${lastSyncedAt}...`);
      const newSyncTimestamp = new Date().toISOString();
      const latestResults = await performFullSync(lastSyncedAt); // Get only what's new
      
      if (latestResults.length > 0) {
        // Merge with existing cache
        await transcriptionStorage.storeTranscriptions(latestResults);
        console.log(`✅ Latest sync: ${latestResults.length} new/updated transcriptions and invites`);
      } else {
        console.log('✅ Latest sync: No new transcriptions or invites');
      }
      
      // Update sync timestamp to now
      await transcriptionStorage.setLastSyncedAt(user.userId, newSyncTimestamp);
      
      // Return all cached transcriptions (old + new)
      const allCached = await transcriptionStorage.getAll();
      console.log(`📦 Returning ${allCached.length} transcriptions (cached + latest)`);
      return allCached;
    }
    
  } catch (error) {
    console.error('❌ LoadAll failed:', error);
    
    // Fallback to direct API call if sync fails
    console.log('🔄 Falling back to direct API call...');
    return await performFullSync(); // Full sync fallback
  }
};

/**
 * Validates cached transcriptions against current access permissions
 * Removes transcriptions that are no longer accessible (deleted by owner, invite revoked, etc.)
 */
const validateCachedTranscriptions = async (): Promise<void> => {
  try {
    console.log('🔍 Validating cached transcriptions against current permissions...');
    
    // Get current accessible transcriptions from API (this respects ACL)
    const currentAccessible = await performFullSync();
    const currentIds = new Set(currentAccessible.map(t => t.id));
    
    // Get cached transcriptions
    const cached = await transcriptionStorage.getAll();
    
    // Find transcriptions that are cached but no longer accessible
    const orphanedIds = cached
      .filter(t => !currentIds.has(t.id))
      .map(t => t.id);
    
    if (orphanedIds.length > 0) {
      console.log(`🧹 Removing ${orphanedIds.length} orphaned transcriptions from cache:`, orphanedIds);
      
      // Remove orphaned transcriptions from cache
      for (const id of orphanedIds) {
        await transcriptionStorage.removeTranscription(id);
      }
      
      console.log('✅ Cache cleanup completed');
    } else {
      console.log('✅ Cache validation passed - no orphaned transcriptions');
    }
    
  } catch (error) {
    console.warn('⚠️ Cache validation failed, continuing with existing cache:', error);
  }
};

/**
 * Performs a hybrid full sync using efficient GSI queries + invite discovery
 * @param sinceTimestamp Optional timestamp for incremental sync
 */
const performFullSync = async (sinceTimestamp?: string): Promise<TranscriptionModel[]> => {
  const user = currentUser();
  if (!user?.userId) {
    throw new Error('User must be authenticated to perform sync');
  }

  const syncType = sinceTimestamp ? 'incremental' : 'full';
  console.log(`🔍 Performing hybrid ${syncType} sync...`);
  
  try {
    // Load owned transcriptions via efficient GSI
    let ownedTranscriptions: TranscriptionModel[] = [];
    if (sinceTimestamp) {
      // Incremental sync for owned transcriptions
      ownedTranscriptions = await loadOwnedTranscriptionsSince(user.userId, sinceTimestamp);
    } else {
      // Full sync for owned transcriptions
      ownedTranscriptions = await loadOwnedTranscriptions(user.userId);
    }
    console.log(`📝 Loaded ${ownedTranscriptions.length} owned transcriptions`);
    
    // Load shared transcriptions via invites (need email for invite lookup)
    let sharedTranscriptions: TranscriptionModel[] = [];
    if (user.username) { // username is typically the email in Cognito
      sharedTranscriptions = await loadSharedTranscriptions(user.username, sinceTimestamp);
      console.log(`🤝 Loaded ${sharedTranscriptions.length} shared transcriptions`);
    }
    
    // Combine and deduplicate (in case user has both ownership and invite access)
    const allTranscriptions = new Map<string, TranscriptionModel>();
    
    // Add owned transcriptions
    ownedTranscriptions.forEach(t => allTranscriptions.set(t.id, t));
    
    // Add shared transcriptions (won't overwrite owned ones due to Map)
    sharedTranscriptions.forEach(t => allTranscriptions.set(t.id, t));
    
    const combinedTranscriptions = Array.from(allTranscriptions.values());
    
    console.log(`✅ Hybrid sync completed: ${combinedTranscriptions.length} total transcriptions (${ownedTranscriptions.length} owned + ${sharedTranscriptions.length} shared)`);
    return combinedTranscriptions;
    
  } catch (error) {
    console.error('❌ Hybrid sync failed:', error);
    throw error;
  }
};


/**
 * Loads only transcriptions owned by the current user
 * @returns Array of TranscriptionModel instances owned by the user
 */
export const loadOwnedTranscriptionsOnly = async (): Promise<TranscriptionModel[]> => {
  const user = currentUser();
  if (!user?.userId) {
    throw new Error('User must be authenticated to load owned transcriptions');
  }
  
  
  return await loadOwnedTranscriptions(user.userId);
};

/**
 * Loads only transcriptions shared with the current user
 * @param sinceTimestamp Optional timestamp for incremental sync
 * @returns Array of TranscriptionModel instances shared with the user
 */
export const loadSharedTranscriptionsOnly = async (sinceTimestamp?: string): Promise<TranscriptionModel[]> => {
  const user = currentUser();
  if (!user?.username) {
    throw new Error('User must be authenticated with email to load shared transcriptions');
  }
  
  
  return await loadSharedTranscriptions(user.username, sinceTimestamp);
};

/**
 * Categorizes a list of transcriptions as owned vs shared
 * @param transcriptions Array of transcriptions to categorize
 * @param userId Current user's ID
 * @returns Object with owned and shared arrays
 */
export const categorizeTranscriptions = (
  transcriptions: TranscriptionModel[], 
  userId: string
): { owned: TranscriptionModel[]; shared: TranscriptionModel[] } => {
  const owned: TranscriptionModel[] = [];
  const shared: TranscriptionModel[] = [];
  
  transcriptions.forEach(transcription => {
    if (transcription.author === userId) {
      owned.push(transcription);
    } else {
      shared.push(transcription);
    }
  });
  
  return { owned, shared };
};

/**
 * Creates a new transcription using GraphQL API
 * @param data The transcription data to create
 * @returns The created transcription
 */
export const create = async (data: CreateTranscriptionData): Promise<SharedTranscriptionData> => {
  try {
    const input = {
      title: data.title,
      source: data.source,
      type: data.type,
      author: data.author,
      authorFriendly: data.userLastUpdated,
      userLastUpdated: data.userLastUpdated,
      dateLastUpdated: new Date().toISOString(),
      length: 0, // Will be updated when audio is processed
      isPrivate: data.isPrivate ?? true, // Default to private if not specified
      publicIssues: data.publicIssues ?? false, // Default to private issues if not specified
      disableAnalyzer: false,
    };

    const { data: result } = await getClient().graphql({
      query: createTranscriptionMutation,
      variables: { input },
      authMode: 'iam',
    }) as CreateTranscriptionResponse;

    const created = result?.createTranscription;
    if (!created) {
      throw new Error('Failed to create transcription - no data returned');
    }

    // Invalidate cache after successful creation
    const user = currentUser();
    if (user?.userId) {
      console.log('🔄 Invalidating cache after transcription creation');
      await transcriptionStorage.setLastSyncedAt(user.userId, new Date().toISOString());
      
      // Optimistically add to cache if it exists
      try {
        const model = new TranscriptionModel(created as unknown as ADTTranscriptionData);
        model.setAccessLevel(user.userId);
        await transcriptionStorage.storeTranscriptions([model]);
        console.log('✅ Optimistically added new transcription to cache');
      } catch (cacheError) {
        console.warn('⚠️ Failed to add to cache optimistically:', cacheError);
      }
    }

    return created;
  } catch (error) {
    console.error('❌ Failed to create transcription via API:', error);
    throw error;
  }
};

/**
 * Updates an existing transcription using GraphQL API
 * @param transcriptionId The ID of the transcription to update
 * @param updates The fields to update
 * @returns The updated transcription
 */
export const updateTranscription = async (
  transcriptionId: string, 
  updates: {
    title?: string;
    comments?: string;
    isPrivate?: boolean;
    publicIssues?: boolean;
    lang?: string;
    userLastUpdated: string;
  }
): Promise<SharedTranscriptionData> => {
  try {
    // First, get the current transcription to get the _version for conflict detection
    const { data: getData } = await getClient().graphql({
      query: getTranscription,
      variables: { id: transcriptionId }
    }) as GraphQLResponse<GetTranscriptionResponse>;

    const existing = getData?.getTranscription;
    if (!existing) {
      throw new Error(`Transcription with ID ${transcriptionId} not found`);
    }

    const input = {
      id: transcriptionId,
      _version: existing._version,
      ...updates,
      dateLastUpdated: new Date().toISOString(),
    };

    const { data: result } = await getClient().graphql({
      query: updateTranscriptionMutation,
      variables: { input },
      authMode: 'iam',
    }) as UpdateTranscriptionResponse;

    const updated = result?.updateTranscription;
    if (!updated) {
      throw new Error('Failed to update transcription - no data returned');
    }

    // Invalidate cache and update optimistically
    const user = currentUser();
    if (user?.userId) {
      console.log('🔄 Invalidating cache after transcription update');
      await transcriptionStorage.setLastSyncedAt(user.userId, new Date().toISOString());
      
      // Optimistically update cache if it exists
      try {
        const model = new TranscriptionModel(updated as unknown as ADTTranscriptionData);
        model.setAccessLevel(user.userId);
        await transcriptionStorage.storeTranscriptions([model]);
        console.log('✅ Optimistically updated transcription in cache');
      } catch (cacheError) {
        console.warn('⚠️ Failed to update cache optimistically:', cacheError);
      }
    }

    return updated;
  } catch (error) {
    console.error('❌ Failed to update transcription via API:', error);
    throw error;
  }
};

/**
 * Deletes a transcription using GraphQL API
 * @param transcriptionId The ID of the transcription to delete
 * @returns The deleted transcription data
 */
export const deleteTranscription = async (transcriptionId: string): Promise<SharedTranscriptionData> => {
  try {
    // First, get the current transcription to get the _version for conflict detection
    const { data: getData } = await getClient().graphql({
      query: getTranscription,
      variables: { 
        id: transcriptionId,
        filter: { 
          _deleted: { ne: true }
        }
      }
    }) as GraphQLResponse<GetTranscriptionResponse>;

    const existing = getData?.getTranscription;
    if (!existing) {
      throw new Error(`Transcription with ID ${transcriptionId} not found`);
    }

    const input = {
      id: transcriptionId,
      _version: existing._version,
    };

    const { data: result } = await getClient().graphql({
      query: deleteTranscriptionMutation,
      variables: { input },
      authMode: 'iam',
    }) as DeleteTranscriptionResponse;

    const deleted = result?.deleteTranscription;
    if (!deleted) {
      throw new Error('Failed to delete transcription - no data returned');
    }

    // Remove from cache and invalidate
    const user = currentUser();
    if (user?.userId) {
      console.log('🔄 Removing deleted transcription from cache');
      await transcriptionStorage.removeTranscription(transcriptionId);
      await transcriptionStorage.setLastSyncedAt(user.userId, new Date().toISOString());
      console.log('✅ Removed transcription from cache after deletion');
    }

    return deleted;
  } catch (error) {
    console.error('❌ Failed to delete transcription via API:', error);
    throw error;
  }
};
