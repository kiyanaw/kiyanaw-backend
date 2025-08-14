import { generateClient } from 'aws-amplify/api';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - GraphQL queries are generated as JS files
import { listIssues } from '../graphql/queries.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - GraphQL mutations are generated as JS files
import { createIssue, updateIssue, deleteIssue } from '../graphql/mutations.js';
// DO NOT MODIFY THIS NEXT IMPORT
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error - GraphQL subscriptions are generated as JS files
import { onCreateIssue, onUpdateIssue, onDeleteIssue } from '../graphql/subscriptions.js';
import type { IssueData } from './adt';



// Create GraphQL client
const client = generateClient();

export type IssueSubscriptionEvent = {
  mutation: 'CREATE' | 'UPDATE' | 'DELETE';
  issue: IssueData;
};

/**
 * Loads issues for a given transcription.
 * @param transcriptionId The ID of the transcription to load issues for
 * @returns Issues sorted by creation date (newest first)
 */
export const loadIssuesForTranscription = async (transcriptionId: string): Promise<IssueData[]> => {
  try {
    console.log(`🔍 Loading issues for transcription ${transcriptionId} via GraphQL...`);
    
    const result = await client.graphql({
      query: listIssues,
      variables: { 
        filter: { 
          transcriptionId: { eq: transcriptionId },
          _deleted: { ne: true }
        },
        limit: 2000 // arbitrarily high
      },
    }) as { data: { listIssues: { items: IssueData[] } } };
    
    const issues = result.data?.listIssues?.items || [];
    console.log(`📊 Found ${issues.length} issues for transcription ${transcriptionId}`);
    
    // Sort issues by creation date (newest first)
    return issues.sort(
      (a: IssueData, b: IssueData) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      }
    );
  } catch (error) {
    console.error('❌ Failed to load issues via GraphQL:', error);
    // Return empty array on error to prevent app crashes
    return [];
  }
};

/**
 * Creates a new issue
 */
export const createIssueForRegion = async (issueData: {
  text: string;
  type: string;
  owner: string;
  ownerFriendly: string;
  regionId: string;
  transcriptionId: string;
}, username: string): Promise<IssueData> => {
  try {
    console.log('🔨 Creating new issue via GraphQL...');
    
    const result = await client.graphql({
      query: createIssue,
      variables: {
        input: {
          ...issueData,
          resolved: false,
          index: 0, // Will be auto-incremented by the backend
          dateLastUpdated: new Date().toISOString(),
          userLastUpdated: username,
        }
      }
    }) as { data: { createIssue: IssueData } };
    
    console.log('✅ Issue created successfully');
    return result.data.createIssue;
  } catch (error) {
    console.error('❌ Failed to create issue:', error);
    throw error;
  }
};

/**
 * Updates an existing issue
 */
export const updateExistingIssue = async (issueId: string, updates: Partial<IssueData>, version: number, username: string): Promise<IssueData> => {
  try {
    console.log(`🔧 Updating issue ${issueId} via GraphQL...`);
    
    // Filter out read-only fields that shouldn't be sent to GraphQL
    // Keep _version for optimistic concurrency control
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt, updatedAt, __typename, ...allowedUpdates } = updates as Record<string, unknown>;
    
    const result = await client.graphql({
      query: updateIssue,
      variables: {
        input: {
          id: issueId,
          _version: version,
          ...allowedUpdates,
          dateLastUpdated: new Date().toISOString(),
          userLastUpdated: username,
        }
      }
    }) as { data: { updateIssue: IssueData } };
    
    console.log('✅ Issue updated successfully');
    return result.data.updateIssue;
  } catch (error) {
    console.error('❌ Failed to update issue:', error);
    throw error;
  }
};

/**
 * Deletes an issue
 */
export const deleteExistingIssue = async (issueId: string, version: number): Promise<void> => {
  try {
    console.log(`🗑️ Deleting issue ${issueId} via GraphQL...`);
    
    await client.graphql({
      query: deleteIssue,
      variables: {
        input: { 
          id: issueId,
          _version: version
        }
      }
    });
    
    console.log('✅ Issue deleted successfully');
  } catch (error) {
    console.error('❌ Failed to delete issue:', error);
    throw error;
  }
};

/**
 * Subscribe to issue changes for a given transcription
 * @param transcriptionId The ID of the transcription to subscribe to
 * @param onEvent Callback function to handle subscription events
 * @returns Object with unsubscribe function
 */
export const subscribeToIssueChanges = (
  transcriptionId: string,
  onEvent: (event: IssueSubscriptionEvent) => void
): (() => void) => {
  console.log('🔌 Setting up issue subscriptions for transcriptionId:', transcriptionId);

  try {
    const subscriptions: Array<{ unsubscribe: () => void }> = [];

    // Subscribe to issue creation
    const createSub = (client.graphql({
      query: onCreateIssue,
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
        const issue = result.data?.onCreateIssue;
        if (issue) {
          console.log('🔌 Issue CREATE subscription event:', issue.id);
          onEvent({ mutation: 'CREATE', issue });
        }
      },
      error: (error: Error) => console.error('Create issue subscription error:', error)
    });

    // Subscribe to issue updates
    const updateSub = (client.graphql({
      query: onUpdateIssue,
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
        const issue = result.data?.onUpdateIssue;
        if (issue) {
          console.log('🔌 Issue UPDATE subscription event:', issue.id);
          onEvent({ mutation: 'UPDATE', issue });
        }
      },
      error: (error: Error) => console.error('Update issue subscription error:', error)
    });

    // Subscribe to issue deletion
    const deleteSub = (client.graphql({
      query: onDeleteIssue,
      variables: {
        filter: {
          transcriptionId: { eq: transcriptionId }
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any).subscribe({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: (result: any) => {
        const issue = result.data?.onDeleteIssue;
        if (issue) {
          console.log('🔌 Issue DELETE subscription event:', issue.id);
          onEvent({ mutation: 'DELETE', issue });
        }
      },
      error: (error: Error) => console.error('Delete issue subscription error:', error)
    });

    subscriptions.push(createSub, updateSub, deleteSub);

    // Return unsubscribe function
    return () => {
      console.log('🔌 Unsubscribing from issue changes');
      subscriptions.forEach(sub => {
        try {
          sub.unsubscribe();
        } catch (error) {
          console.warn('Error unsubscribing from issue subscription:', error);
        }
      });
    };
  } catch (error) {
    console.error('🔌 Failed to establish issue subscriptions:', error);
    return () => {}; // Return no-op function on error
  }
}; 