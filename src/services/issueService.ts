import { generateClient } from 'aws-amplify/api';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - GraphQL queries are generated as JS files
import { listIssues } from '../graphql/queries.js';
import type { IssueData } from './adt';

// Create GraphQL client
const client = generateClient();

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
        filter: { transcriptionId: { eq: transcriptionId } },
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