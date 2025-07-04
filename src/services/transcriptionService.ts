import { generateClient } from 'aws-amplify/api';
import { getUrl } from 'aws-amplify/storage';
// @ts-ignore - GraphQL queries are generated as JS files
import { getTranscription } from '../graphql/queries.js';

import { loadRegionsForTranscription } from './regionService';
import { loadIssuesForTranscription } from './issueService';
import { TranscriptionModel } from './adt';

// Create GraphQL client
const client = generateClient();

export interface CreateTranscriptionData {
  title: string;
  source: string;
  type: string;
  author: string;
  userLastUpdated: string;
}

/**
 * Extracts the S3 key from a source URL
 * @param sourceUrl The full S3 URL (e.g., https://bucket.s3.amazonaws.com/public/key.mp3)
 * @returns The S3 key (e.g., key.mp3)
 */
const extractS3KeyFromUrl = (sourceUrl: string): string => {
  try {
    const url = new URL(sourceUrl);
    const pathname = url.pathname;
    
    // Remove leading slash and 'public/' prefix if present
    let key = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    if (key.startsWith('public/')) {
      key = key.slice(7); // Remove 'public/' prefix
    }
    
    return key;
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
    
    const { url } = await getUrl({
      path: `public/${targetKey}`,
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
export const loadInFull = async (transcriptionId: string): Promise<false | {
  transcription: any;
  peaks: number[];
  regions: any[];
  issues: any[];
}> => {
  if (!transcriptionId) {
    throw new Error('transcriptionId is required');
  }

  // Load via GraphQL API (this will enforce authorization)
  let transcriptionData;
  try {
    console.log('🔍 Loading transcription via GraphQL API...');
    const graphqlResult = await client.graphql({
      query: getTranscription,
      variables: { id: transcriptionId }
    });
    console.log('📊 GraphQL API result:', JSON.stringify(graphqlResult, null, 2));
    
    transcriptionData = graphqlResult.data.getTranscription;
    if (!transcriptionData) {
      return false; // Transcription not found
    }
  } catch (error) {
    console.error('❌ GraphQL API query failed - access denied:', error);
    return false; // Return false instead of throwing error
  }

  // Create TranscriptionModel from GraphQL data
  const transcription = new TranscriptionModel(transcriptionData as any);

  // Handle missing source
  if (!transcription.source) {
    throw new Error('Transcription source is required to load peaks data');
  }
  
  const peaks = await fetchPeaksData(transcription.source);

  const [regions, issues] = await Promise.all([
    loadRegionsForTranscription(transcriptionId),
    loadIssuesForTranscription(transcriptionId)
  ]);

  return {
    transcription: transcription,
    peaks,
    regions,
    issues,
  };
};

// TODO: Implement create and update functions using GraphQL mutations instead of DataStore
// These functions are commented out since DataStore is being removed

/*
export const create = async (data: CreateTranscriptionData): Promise<any> => {
  // TODO: Implement using GraphQL createTranscription mutation
  throw new Error('Create function needs to be reimplemented with GraphQL');
};

export const updateTranscription = async (
  transcriptionId: string, 
  updates: {
    title?: string;
    comments?: string;
    userLastUpdated: string;
  }
): Promise<any> => {
  // TODO: Implement using GraphQL updateTranscription mutation
  throw new Error('Update function needs to be reimplemented with GraphQL');
};
*/ 