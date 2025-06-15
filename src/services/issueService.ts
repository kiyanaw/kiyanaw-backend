import { DataStore } from '@aws-amplify/datastore';
import { Issue } from '../models';

/**
 * Loads and processes issues for a given transcription.
 * @param transcriptionId The ID of the transcription to load issues for
 * @returns Processed and sorted issues with parsed comments
 */
export const loadIssuesForTranscription = async (transcriptionId: string) => {
  const issues = await DataStore.query(Issue, (i) => i.transcription.id.eq(transcriptionId));
  
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
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}; 