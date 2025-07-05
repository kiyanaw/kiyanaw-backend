import { generateClient } from 'aws-amplify/api';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - GraphQL queries are generated as JS files
import { listIssues } from '../graphql/queries.js';
import type { IssueData, ProcessedIssue, IssueComment } from './adt';

// Create GraphQL client
const client = generateClient();

/**
 * Loads and processes issues for a given transcription.
 * @param transcriptionId The ID of the transcription to load issues for
 * @returns Processed and sorted issues with parsed comments
 */
export const loadIssuesForTranscription = async (transcriptionId: string): Promise<ProcessedIssue[]> => {
  try {
    console.log(`🔍 Loading issues for transcription ${transcriptionId} via GraphQL...`);
    
    const result = await client.graphql({
      query: listIssues,
      variables: { 
        filter: { transcriptionId: { eq: transcriptionId } }
      }
    }) as { data: { listIssues: { items: IssueData[] } } };
    
    const issues = result.data?.listIssues?.items || [];
    console.log(`📊 Found ${issues.length} issues for transcription ${transcriptionId}`);
    
    // Process issues: parse comments and sort
    return issues.map((issue: IssueData): ProcessedIssue => {
      let comments: IssueComment[] = [];
      try {
        comments = issue.comments ? JSON.parse(issue.comments) : [];
      } catch {
        console.warn('Failed to parse comments for issue:', issue.id);
        comments = [];
      }
      return {
        ...issue,
        comments: comments.sort(
          (a: IssueComment, b: IssueComment) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
      };
    }).sort(
      (a: ProcessedIssue, b: ProcessedIssue) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('❌ Failed to load issues via GraphQL:', error);
    // Return empty array on error to prevent app crashes
    return [];
  }
}; 