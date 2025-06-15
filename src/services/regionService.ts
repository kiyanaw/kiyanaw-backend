import { DataStore } from '@aws-amplify/datastore';
import { Region } from '../models';

/**
 * Loads and processes regions for a given transcription.
 * @param transcriptionId The ID of the transcription to load regions for
 * @returns Processed and sorted regions
 */
export const loadRegionsForTranscription = async (transcriptionId: string) => {
  const regions = await DataStore.query(Region, (r) => r.transcription.id.eq(transcriptionId));
  
  // Process and sort regions by start time
  return regions
    .slice()
    .sort((a, b) => (a.start > b.start ? 1 : -1));
}; 