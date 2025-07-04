import { generateClient } from 'aws-amplify/api';
// @ts-ignore - GraphQL queries are generated as JS files
import { listIssues } from '../graphql/queries.js';

// Create GraphQL client
const client = generateClient();

/**
 * Loads and processes issues for a given transcription.
 * @param transcriptionId The ID of the transcription to load issues for
 * @returns Processed and sorted issues with parsed comments
 */
export const loadIssuesForTranscription = async (transcriptionId: string) => {
  try {
    console.log(`🔍 Loading issues for transcription ${transcriptionId} via GraphQL...`);
    
    const result = await client.graphql({
      query: listIssues,
      variables: { 
        filter: { transcriptionId: { eq: transcriptionId } }
      }
    }) as any;
    
    const issues = result.data?.listIssues?.items || [];
    console.log(`📊 Found ${issues.length} issues for transcription ${transcriptionId}`);
    
    // Process issues: parse comments and sort
    return issues.map((issue: any) => {
      let comments = [];
      try {
        comments = issue.comments ? JSON.parse(issue.comments) : [];
      } catch (e) {
        console.warn('Failed to parse comments for issue:', issue.id);
        comments = [];
      }
      return {
        ...issue,
        comments: comments.sort(
          (a: any, b: any) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
      };
    }).sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('❌ Failed to load issues via GraphQL:', error);
    // Return empty array on error to prevent app crashes
    return [];
  }
}; 