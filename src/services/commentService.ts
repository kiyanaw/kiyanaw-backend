import { generateClient } from 'aws-amplify/api';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - GraphQL queries are generated as JS files
import { listComments } from '../graphql/queries.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - GraphQL mutations are generated as JS files
import { createComment, updateComment, deleteComment } from '../graphql/mutations.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - GraphQL subscriptions are generated as JS files
import { onCreateComment, onDeleteComment } from '../graphql/subscriptions.js';
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
    console.debug(`🔍 Loading comments for transcription ${transcriptionId} via GraphQL...`);
    
    const result = await getClient().graphql({
      query: listComments,
      variables: { 
        filter: { 
          transcriptionId: { eq: transcriptionId },
          _deleted: { ne: true }
        },
        limit: 2000 // arbitrarily high
      },
    }) as { data: { listComments: { items: CommentData[] } } };
    
    const comments = result.data?.listComments?.items || [];
    console.debug(`💬 Found ${comments.length} comments for transcription ${transcriptionId}`);
    
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

/**
 * Creates a new comment.
 * @param input Comment data without ID, timestamps, and version
 * @returns The created comment
 */
export const createNewComment = async (
  input: Omit<CommentData, 'id' | 'createdAt' | 'updatedAt' | '_version'>
): Promise<CommentData> => {
  try {
    console.debug(`📝 Creating comment for entity ${input.entityType}:${input.entityId}...`);
    
    const result = await getClient().graphql({
      query: createComment,
      variables: { input },
    }) as { data: { createComment: CommentData } };
    
    const comment = result.data?.createComment;
    if (!comment) {
      throw new Error('Failed to create comment - no data returned');
    }
    
    console.info(`✅ Comment created successfully: ${comment.id}`);
    return comment;
  } catch (error) {
    console.error('❌ Failed to create comment:', error);
    throw error;
  }
};

/**
 * Updates an existing comment.
 * @param commentId The ID of the comment to update
 * @param updates Partial comment data to update
 * @param version Current version for optimistic concurrency control
 * @returns The updated comment
 */
export const updateExistingComment = async (
  commentId: string,
  updates: Partial<CommentData>,
  version: number
): Promise<CommentData> => {
  try {
    console.debug(`📝 Updating comment ${commentId} (version ${version})...`);
    
    // Filter out read-only fields that shouldn't be sent to GraphQL
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, createdAt, updatedAt, _version, __typename, ...filteredUpdates } = updates as Record<string, unknown>;
    
    const result = await getClient().graphql({
      query: updateComment,
      variables: { 
        input: { 
          id: commentId, 
          _version: version,
          ...filteredUpdates 
        } 
      },
    }) as { data: { updateComment: CommentData } };
    
    const comment = result.data?.updateComment;
    if (!comment) {
      throw new Error('Failed to update comment - no data returned');
    }
    
    console.info(`✅ Comment updated successfully: ${comment.id}`);
    return comment;
  } catch (error) {
    console.error('❌ Failed to update comment:', error);
    throw error;
  }
};

/**
 * Deletes a comment.
 * @param commentId The ID of the comment to delete
 * @param version Current version for optimistic concurrency control
 */
export const deleteExistingComment = async (
  commentId: string,
  version: number
): Promise<void> => {
  try {
    console.debug(`🗑️ Deleting comment ${commentId} (version ${version})...`);
    
    await getClient().graphql({
      query: deleteComment,
      variables: { 
        input: { 
          id: commentId, 
          _version: version 
        } 
      },
    });
    
    console.info(`✅ Comment deleted successfully: ${commentId}`);
  } catch (error) {
    console.error('❌ Failed to delete comment:', error);
    throw error;
  }
};

export type CommentSubscriptionEvent = {
  mutation: 'CREATE' | 'DELETE';
  comment: CommentData;
};

/**
 * Subscribe to comment changes for a given transcription
 * @param transcriptionId The ID of the transcription to subscribe to
 * @param onEvent Callback function to handle subscription events
 * @returns Function to unsubscribe from all comment subscriptions
 */
export const subscribeToCommentChanges = (
  transcriptionId: string,
  onEvent: (event: CommentSubscriptionEvent) => void
): (() => void) => {
  console.debug('🔌 Setting up comment subscriptions for transcriptionId:', transcriptionId);

  try {
    const subscriptions: Array<{ unsubscribe: () => void }> = [];

    // Subscribe to comment creation
    const createSub = (getClient().graphql({
      query: onCreateComment,
      variables: {
        filter: {
          transcriptionId: { eq: transcriptionId },
          _deleted: { ne: true }
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any).subscribe({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: (result: any) => {
        const comment = result.data?.onCreateComment;
        if (comment) {
          console.debug('🔌 Comment CREATE subscription event:', comment.id);
          onEvent({ mutation: 'CREATE', comment });
        }
      },
      error: (error: Error) => console.error('Create comment subscription error:', error)
    });

    // Subscribe to comment deletion
    const deleteSub = (getClient().graphql({
      query: onDeleteComment,
      variables: {
        filter: {
          transcriptionId: { eq: transcriptionId }
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any).subscribe({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: (result: any) => {
        const comment = result.data?.onDeleteComment;
        if (comment) {
          console.debug('🔌 Comment DELETE subscription event:', comment.id);
          onEvent({ mutation: 'DELETE', comment });
        }
      },
      error: (error: Error) => console.error('Delete comment subscription error:', error)
    });

    subscriptions.push(createSub, deleteSub);

    // Return unsubscribe function
    return () => {
      console.debug('🔌 Unsubscribing from comment changes');
      subscriptions.forEach(sub => {
        try {
          sub.unsubscribe();
        } catch (error) {
          console.warn('Error unsubscribing from comment subscription:', error);
        }
      });
    };
  } catch (error) {
    console.error('🔌 Failed to establish comment subscriptions:', error);
    return () => {}; // Return no-op function on error
  }
};