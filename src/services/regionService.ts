import { DataStore } from '@aws-amplify/datastore';
import { Region as DSRegion, Transcription as DSTranscription } from '../models';

import { RegionModel } from './adt';

/**
 * Loads and processes regions for a given transcription.
 * @param transcriptionId The ID of the transcription to load regions for
 * @returns Processed and sorted regions
 */
export const loadRegionsForTranscription = async (transcriptionId: string) => {
  const rawRegions = await DataStore.query(DSRegion, (r) => r.transcription.id.eq(transcriptionId));
  
  // Process and sort regions by start time
  let regions = rawRegions
    .slice()
    .sort((a, b) => (a.start > b.start ? 1 : -1))
    .map((r) => new RegionModel(r as any));


  console.log('regions', regions)
  return regions
}; 


/**
 * Saves a new region to DataStore.
 * @param transcriptionId The ID of the transcription this region belongs to
 * @param region The region data to save
 * @param username The username of the user creating the region
 * @returns The saved region as a RegionModel
 */
export const saveRegion = async (transcriptionId: string, region: {
  id: string;
  start: number;
  end: number;
  isNote?: boolean;
}, username: string) => {

  const transcription = await DataStore.query(DSTranscription, transcriptionId)
  if (!transcription) {
    throw new Error(`Transcription with ID ${transcriptionId} not found`);
  }

  const newRegion = new DSRegion({
    start: region.start,
    end: region.end,
    isNote: region.isNote || false,
    dateLastUpdated: `${Date.now()}`,
    userLastUpdated: username,
    transcription,
  });
  
  // Set the explicit ID
  (newRegion as any).id = region.id;
  
  const savedRegion = await DataStore.save(newRegion);

  return new RegionModel(savedRegion as any);
};

