import Dexie, { type Table } from 'dexie';
import type { IssueData, RegionData } from './adt';

/**
 * On-device storage for local mode. Kept separate from the cloud cache
 * (KiyanawSyncDB) so signing out or switching accounts never touches local work.
 */

export interface LocalProjectRecord {
  id: string;
  title: string;
  mediaName: string;
  mediaType: string;
  isVideo: boolean;
  length: number;
  regionCount: number;
  coverage: number;
  createdAt: string;
  dateLastUpdated: string;
}

export interface LocalRegionRecord extends Omit<RegionData, 'regionSuggestions'> {
  _version: number;
}

export type LocalIssueRecord = IssueData & { _version: number };

export interface LocalPeaksRecord {
  projectId: string;
  length: number;
  data: number[];
}

class KiyanawLocalDB extends Dexie {
  projects!: Table<LocalProjectRecord, string>;
  regions!: Table<LocalRegionRecord, string>;
  peaks!: Table<LocalPeaksRecord, string>;
  issues!: Table<LocalIssueRecord, string>;

  constructor() {
    super('KiyanawLocalDB');
    this.version(1).stores({
      projects: 'id, dateLastUpdated',
      regions: 'id, transcriptionId',
      peaks: 'projectId',
    });
    this.version(2).stores({
      issues: 'id, transcriptionId',
    });
  }
}

export const localDb = new KiyanawLocalDB();

/** Number of local projects on this device. Safe to call before sign-in; touches no network. */
export const countProjects = (): Promise<number> => localDb.projects.count();
