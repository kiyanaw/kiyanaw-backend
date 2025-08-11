import { generateClient } from 'aws-amplify/api';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - GraphQL queries are generated as JS files
import { listComments } from '../graphql/queries.js';
import type { CommentData } from './adt';
import type { GraphQLClient } from '../types/shared';

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
 * Loads comments for a given transcription.
 * @param transcriptionId The ID of the transcription to load comments for
 * @returns Comments sorted by creation date (newest first)
 */
export const loadCommentsForTranscription = async (transcriptionId: string): Promise<CommentData[]> => {
  try {
    console.log(`🔍 Loading comments for transcription ${transcriptionId} via GraphQL...`);
    
    const result = await getClient().graphql({
      query: listComments,
      variables: { 
        filter: { transcriptionId: { eq: transcriptionId } },
        limit: 2000 // arbitrarily high
      },
    }) as { data: { listComments: { items: CommentData[] } } };
    
    const comments = result.data?.listComments?.items || [];
    console.log(`💬 Found ${comments.length} comments for transcription ${transcriptionId}`);
    
    // Sort comments by creation date (newest first)
    return comments.sort(
      (a: CommentData, b: CommentData) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      }
    );
  } catch (error) {
    console.error('❌ Failed to load comments via GraphQL:', error);
    // Return empty array on error to prevent app crashes
    return [];
  }
};