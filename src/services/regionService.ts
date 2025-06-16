import { DataStore } from '@aws-amplify/datastore';
import { Region as DSRegion } from '../models';

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


  regions = sortAndIndexRegions(regions)
  console.log('regions', regions)
  return regions
}; 

/**
 * Sorts regions by start time and adds index information.
 * Regions marked as notes have a null displayIndex, others increment from 1.
 * @param regions Array of regions to process
 * @returns Processed and indexed regions array
 */
export const sortAndIndexRegions = (regions: RegionModel[]) => {
  let displayIndex = 1;

  return regions
    .sort((a, b) => (a.start > b.start ? 1 : -1))
    .map((item, index) => {
      item.index = index;
      item.displayIndex = item.isNote ? undefined : displayIndex;
      
      if (!item.isNote) {
        displayIndex++;
      }

      return item;
    });
};


