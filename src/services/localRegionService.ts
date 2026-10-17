import { RegionModel, type RegionData } from './adt';
import { localDb, type LocalRegionRecord } from './localDbService';

/**
 * Local-mode replacements for regionService. Same signatures and ADTs as the cloud versions.
 * There is only one writer (this device), so versions just count saves; nothing can conflict.
 */

export const loadRegionsForTranscription = async (transcriptionId: string): Promise<RegionModel[]> => {
  const regions = await localDb.regions.where('transcriptionId').equals(transcriptionId).sortBy('start');
  return regions.map((region) => new RegionModel(region));
};

export const createRegion = async (
  transcriptionId: string,
  region: { id: string; start: number; end: number; isNote?: boolean },
  username: string
): Promise<RegionModel> => {
  const now = new Date().toISOString();
  const record: LocalRegionRecord = {
    id: region.id,
    transcriptionId,
    start: region.start,
    end: region.end,
    isNote: region.isNote ?? false,
    regionText: '',
    translation: '',
    createdAt: now,
    dateLastUpdated: now,
    userLastUpdated: username,
    _version: 1,
  };
  await localDb.regions.add(record);
  return new RegionModel(record);
};

export const updateRegion = async (
  regionId: string,
  updates: Partial<RegionData>,
  username: string,
  // Kept for signature parity with the cloud service; a single local writer can't conflict.
  _version: number
): Promise<void> => {
  void _version;
  await localDb.transaction('rw', localDb.regions, async () => {
    const existing = await localDb.regions.get(regionId);
    if (!existing) {
      throw new Error(`Region ${regionId} not found`);
    }
    // Spelling suggestions are derived UI state, never persisted.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { regionSuggestions, ...persistable } = updates;
    await localDb.regions.put({
      ...existing,
      ...persistable,
      id: regionId,
      transcriptionId: existing.transcriptionId,
      dateLastUpdated: new Date().toISOString(),
      userLastUpdated: username,
      _version: existing._version + 1,
    });
  });
};

export const getRegion = async (regionId: string): Promise<LocalRegionRecord | null> =>
  (await localDb.regions.get(regionId)) ?? null;

export const deleteRegion = async (regionId: string): Promise<void> => {
  const existing = await localDb.regions.get(regionId);
  if (!existing) {
    throw new Error(`Region with ID ${regionId} not found`);
  }
  await localDb.regions.delete(regionId);
};

