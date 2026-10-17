import { TranscriptionModel, type TranscriptionData } from './adt';
import type { LoadTranscriptionResult } from '../types/shared';
import { localDb, type LocalProjectRecord } from './localDbService';
import { loadRegionsForTranscription } from './localRegionService';
import { getMediaUrl, sourceForProject } from './localMediaService';
import { PEAKS_PER_SECOND } from '../lib/peaksFold';

/**
 * Local-mode replacements for the parts of transcriptionService the editor uses.
 * Same signatures and ADTs as the cloud versions; storage is IndexedDB + OPFS.
 */

/** The single identity that owns everything in local mode: this device. */
export const LOCAL_USER = { userId: 'local-device', username: 'local' } as const;

const toTranscriptionData = (record: LocalProjectRecord): TranscriptionData => ({
  id: record.id,
  title: record.title,
  author: LOCAL_USER.userId,
  authorFriendly: 'This device',
  type: record.isVideo ? 'video' : 'audio',
  source: sourceForProject(record.id),
  length: record.length,
  regionCount: record.regionCount,
  coverage: record.coverage,
  isPrivate: true,
  publicIssues: false,
  disableAnalyzer: true,
  createdAt: record.createdAt,
  dateLastUpdated: record.dateLastUpdated,
  userLastUpdated: LOCAL_USER.username,
});

const toModel = (record: LocalProjectRecord): TranscriptionModel => {
  const model = new TranscriptionModel(toTranscriptionData(record));
  model.setAccessLevel(LOCAL_USER.userId);
  return model;
};

/** Local media URLs don't expire, so there are no credentials to refresh. */
export const forceFreshCredentials = async (): Promise<void> => {};

export const generateSignedUrl = (source: string): Promise<string> => getMediaUrl(source);

export const getSignedUrlExpirationTime = (): number | null => null;

export const loadInFull = async (transcriptionId: string): Promise<false | LoadTranscriptionResult> => {
  const record = await localDb.projects.get(transcriptionId);
  if (!record) {
    return false;
  }
  const peaks = await localDb.peaks.get(transcriptionId);
  if (!peaks) {
    throw new Error(`Local project ${transcriptionId} has no waveform data`);
  }
  const regions = await loadRegionsForTranscription(transcriptionId);

  return {
    transcription: toModel(record),
    peaks: peaks.data,
    peaksDuration: peaks.length / PEAKS_PER_SECOND,
    regions,
    issues: [],
    comments: [],
  };
};

export const updateTranscription = async (
  transcriptionId: string,
  updates: {
    title?: string;
    comments?: string;
    isPrivate?: boolean;
    publicIssues?: boolean;
    lang?: string;
    userLastUpdated: string;
    regionCount?: number;
    coverage?: number;
    length?: number;
  }
): Promise<TranscriptionData> => {
  const changes: Partial<LocalProjectRecord> = { dateLastUpdated: new Date().toISOString() };
  if (updates.title !== undefined) changes.title = updates.title;
  if (updates.regionCount !== undefined) changes.regionCount = updates.regionCount;
  if (updates.coverage !== undefined) changes.coverage = updates.coverage;
  if (updates.length !== undefined) changes.length = updates.length;

  const updatedCount = await localDb.projects.update(transcriptionId, changes);
  if (updatedCount === 0) {
    throw new Error(`Local project ${transcriptionId} not found`);
  }
  const record = await localDb.projects.get(transcriptionId);
  return toTranscriptionData(record!);
};

export const listLocalTranscriptions = async (): Promise<TranscriptionModel[]> => {
  const records = await localDb.projects.orderBy('dateLastUpdated').reverse().toArray();
  return records.map(toModel);
};

export const listProjectIds = (): Promise<string[]> => localDb.projects.toCollection().primaryKeys();

export const createLocalProject = async (
  project: LocalProjectRecord,
  peaks: { length: number; data: number[] }
): Promise<TranscriptionModel> => {
  await localDb.transaction('rw', localDb.projects, localDb.peaks, async () => {
    await localDb.projects.add(project);
    await localDb.peaks.add({ projectId: project.id, ...peaks });
  });
  return toModel(project);
};
