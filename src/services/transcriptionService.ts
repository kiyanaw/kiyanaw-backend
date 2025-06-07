import { DataStore } from '@aws-amplify/datastore';
import { Transcription, Region, Issue } from '../models';

/**
 * Fetches all necessary data for the editor page.
 * This is designed to be used with TanStack Query's queryFn.
 *
 * @param transcriptionId The ID of the transcription to load.
 * @returns An object containing the transcription, regions, and issues.
 */
export const getEditorData = async (transcriptionId: string) => {
  if (!transcriptionId) {
    throw new Error('transcriptionId is required');
  }

  // 1. Load transcription
  const transcription = await DataStore.query(Transcription, transcriptionId);
  if (!transcription) {
    throw new Error('Transcription not found');
  }

  // 2. Load peaks data if available (optional)
  let transcriptionWithPeaks: any = transcription;
  let peaks;
  if (transcription.source) {
      try {
        const peaksResponse = await fetch(`${transcription.source}.json`);
        if (peaksResponse.ok) {
          const peaksObject = await peaksResponse.json();
          // WaveSurfer expects the raw array of peaks, not the wrapper object.
          if (peaksObject && peaksObject.data) {
            peaks = peaksObject.data;
          } else {
            peaks = peaksObject;
          }
          transcriptionWithPeaks = { ...transcription, peaks: peaks };
        }
      } catch (error) {
        console.warn('Could not load peaks data. This is not a critical error.', error);
        // This is not a fatal error, so we continue.
      }
  }


  // 3. Load regions and issues in parallel
  const [regions, issues] = await Promise.all([
    DataStore.query(Region, (r) => r.transcription.id.eq(transcriptionId)),
    DataStore.query(Issue, (i) => i.transcription.id.eq(transcriptionId))
  ]);

  // 4. Process and sort data
  const processedRegions = regions
    .slice()
    .sort((a, b) => (a.start > b.start ? 1 : -1));
  
  const processedIssues = issues.map((issue: any) => {
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

  // 5. Flatten the data structure for the store
  return {
    transcription: transcriptionWithPeaks,
    source: transcription.source,
    peaks: peaks || undefined,
    regions: processedRegions,
    issues: processedIssues,
    isVideo: transcription.type?.startsWith('video/') ?? false,
  };
}; 