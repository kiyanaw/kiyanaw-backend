import type { IssueData } from './adt';
import { localDb, type LocalIssueRecord } from './localDbService';

/**
 * Local-mode replacements for issueService. Same signatures as the cloud versions.
 * One writer (this device), so versions just count saves; nothing can conflict.
 */

export const loadIssuesForTranscription = async (transcriptionId: string): Promise<IssueData[]> => {
  const issues = await localDb.issues.where('transcriptionId').equals(transcriptionId).toArray();
  // Newest first, like the cloud service
  return issues.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
};

export const createIssueForRegion = async (
  issueData: { text: string; type: string; owner: string; ownerFriendly: string; regionId: string; transcriptionId: string },
  username: string
): Promise<IssueData> => {
  const now = new Date().toISOString();
  const existing = await localDb.issues.where('transcriptionId').equals(issueData.transcriptionId).count();
  const record: LocalIssueRecord = {
    ...issueData,
    type: issueData.type as IssueData['type'],
    id: crypto.randomUUID(),
    resolved: false,
    index: existing,
    commentCount: 0,
    createdAt: now,
    updatedAt: now,
    dateLastUpdated: now,
    userLastUpdated: username,
    _version: 1,
  };
  await localDb.issues.add(record);
  return record;
};

export const updateExistingIssue = async (
  issueId: string,
  updates: Partial<IssueData>,
  // Kept for signature parity with the cloud service; a single local writer can't conflict.
  _version: number,
  username: string
): Promise<IssueData> => {
  void _version;
  return localDb.transaction('rw', localDb.issues, async () => {
    const existing = await localDb.issues.get(issueId);
    if (!existing) {
      throw new Error(`Issue ${issueId} not found`);
    }
    const now = new Date().toISOString();
    const updated: LocalIssueRecord = {
      ...existing,
      ...updates,
      id: issueId,
      transcriptionId: existing.transcriptionId,
      updatedAt: now,
      dateLastUpdated: now,
      userLastUpdated: username,
      _version: existing._version + 1,
    };
    await localDb.issues.put(updated);
    return updated;
  });
};

export const deleteExistingIssue = async (issueId: string, _version: number): Promise<void> => {
  void _version;
  const existing = await localDb.issues.get(issueId);
  if (!existing) {
    throw new Error(`Issue ${issueId} not found`);
  }
  await localDb.issues.delete(issueId);
};
