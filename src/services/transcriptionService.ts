import { DataStore } from '@aws-amplify/datastore';
import { Transcription as DSTranscription } from '../models';

import { loadRegionsForTranscription } from './regionService';
import { loadIssuesForTranscription } from './issueService';
import { TranscriptionModel } from './adt';

/**
 * Fetches peaks data for a given audio/video source.
 * @param source The source URL of the media file
 * @returns The peaks data array
 */
const fetchPeaksData = async (source: string): Promise<number[]> => {
  const peaksResponse = await fetch(`${source}.json`);
  if (!peaksResponse.ok) {
    throw new Error(`Failed to load peaks data: ${peaksResponse.status} ${peaksResponse.statusText}`);
  }
  
  const peaksObject = await peaksResponse.json();
  // WaveSurfer expects the raw array of peaks, not the wrapper object.
  if (peaksObject && peaksObject.data) {
    return peaksObject.data;
  } else {
    return peaksObject;
  }
};

/**
 * Fetches all necessary data for the editor page.
 *
 * @param transcriptionId The ID of the transcription to load.
 * @returns An object containing the transcription, regions, and issues.
 */
export const loadInFull = async (transcriptionId: string) => {
  if (!transcriptionId) {
    throw new Error('transcriptionId is required');
  }

  const raw = await DataStore.query(DSTranscription, transcriptionId)
  const transcription = new TranscriptionModel(raw as any);
  if (!transcription) {
    throw new Error('Transcription not found');
  }

  const peaks = await fetchPeaksData(transcription.source!);
  // const transcriptionWithPeaks = { ...transcription, peaks };

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