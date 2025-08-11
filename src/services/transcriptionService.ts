import { generateClient } from 'aws-amplify/api';
import { getUrl } from 'aws-amplify/storage';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - GraphQL queries are generated as JS files
import { getTranscription, listTranscriptions } from '../graphql/queries.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - GraphQL mutations are generated as JS files
import { createTranscription as createTranscriptionMutation, updateTranscription as updateTranscriptionMutation } from '../graphql/mutations.js';

import { loadRegionsForTranscription } from './regionService';
import { loadIssuesForTranscription } from './issueService';
import { loadCommentsForTranscription } from './commentService';
import { TranscriptionModel, type TranscriptionData as ADTTranscriptionData } from './adt';
import { currentUser } from './userService';
import { 
  type GraphQLClient, 
  type GraphQLResponse, 
  type GetTranscriptionResponse, 
  type CreateTranscriptionResponse,
  type UpdateTranscriptionResponse,
  type TranscriptionData as SharedTranscriptionData, 
  type LoadTranscriptionResult,
  type GraphQLListResponse
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
 * Loads all transcriptions using GraphQL API and wraps them in TranscriptionModel instances
 * @returns Array of TranscriptionModel instances
 */
export const loadAll = async (): Promise<TranscriptionModel[]> => {
  try {
    console.log('🔍 Loading all transcriptions via GraphQL API...');
    const graphqlResult = await getClient().graphql({ query: listTranscriptions });
    
    // Cast the result to access the data property
    const response = graphqlResult as { data: GraphQLListResponse<SharedTranscriptionData> };
    
    // The GraphQL result is of shape { listTranscriptions: { items: [...] } }
    const items = response.data?.listTranscriptions?.items ?? [];

    // Get current user for access level determination
    const user = currentUser();
    
    // Wrap each transcription in TranscriptionModel before returning
    const transcriptionModels = items.map(item => {
      const model = new TranscriptionModel(item as unknown as ADTTranscriptionData);
      // Set access level for the current user
      model.setAccessLevel(user?.userId);
      return model;
    });

    console.log(`✅ Loaded ${transcriptionModels.length} transcriptions`);
    return transcriptionModels;
  } catch (error) {
    console.error('❌ Failed to load transcriptions via GraphQL API:', error);
    throw new Error(`Failed to load transcriptions: ${error}`);
  }
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

    return updated;
  } catch (error) {
    console.error('❌ Failed to update transcription via API:', error);
    throw error;
  }
}; 
