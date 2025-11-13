import { useEditorStore } from '../stores/useEditorStore';
import type { RegionData, IssueData, CommentData } from './adt';
import type { ConflictDetail } from './conflictDetectionService';
import type { LazyRegion } from '../models';

/**
 * Service wrapper for all Zustand store operations.
 * Treats application state as an I/O boundary to maintain clean architecture.
 * Consolidates all store access through one service.
 */
export const storeService = {
  // Editor Store operations
  // Region analysis operations
  setRegionAnalysis: (regionId: string, analysis: import('./spellCheckerService').WordAnalysis[]): void => {
    useEditorStore.getState().setRegionAnalysis(regionId, analysis);
  },

  // Transcription access
  get transcription() {
    return useEditorStore.getState().transcription;
  },

  setSaveStatus: (status: 'saved' | 'saving' | 'error'): void => {
    useEditorStore.getState().setSaveStatus(status);
  },

  calculateTranscriptionMetadata: () => {
    return useEditorStore.getState().calculateTranscriptionMetadata();
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setTranscription: (transcription: any) => {
    useEditorStore.getState().setTranscription(transcription);
  },

  addKnownWords: (words: import('./spellCheckerService').WordAnalysis[]): void => {
    useEditorStore.getState().addKnownWords(words);
  },

  getKnownWords: (): Map<string, import('./spellCheckerService').WordAnalysis> => {
    return useEditorStore.getState().knownWords;
  },

  // Region operations for subscription updates
  setRegionText: (regionId: string, text: string): void => {
    useEditorStore.getState().setRegionText(regionId, text);
  },

  setRegionTranslation: (regionId: string, translation: string): void => {
    useEditorStore.getState().setRegionTranslation(regionId, translation);
  },

  updateRegionBounds: (regionId: string, start: number, end: number): void => {
    useEditorStore.getState().updateRegionBounds(regionId, start, end);
  },

  addNewRegion: (region: RegionData): void => {
    useEditorStore.getState().addNewRegion(region);
  },

  deleteRegion: (regionId: string): void => {
    useEditorStore.getState().deleteRegion(regionId);
  },

  // Issue operations for subscription updates
  addNewIssue: (issue: IssueData): void => {
    useEditorStore.getState().addNewIssue(issue);
  },

  updateIssue: (issueId: string, updates: Partial<IssueData>): void => {
    useEditorStore.getState().updateIssue(issueId, updates);
  },

  deleteIssue: (issueId: string): void => {
    useEditorStore.getState().deleteIssue(issueId);
  },

  getIssuesForRegion: (regionId: string): IssueData[] => {
    return useEditorStore.getState().getIssuesForRegion(regionId);
  },

  issueById: (issueId: string): IssueData | null => {
    return useEditorStore.getState().issueById(issueId);
  },

  // Comment operations for subscription updates
  addNewComment: (comment: CommentData): void => {
    useEditorStore.getState().addNewComment(comment);
  },

  updateComment: (commentId: string, updates: Partial<CommentData>): void => {
    useEditorStore.getState().updateComment(commentId, updates);
  },

  deleteComment: (commentId: string): void => {
    useEditorStore.getState().deleteComment(commentId);
  },

  // Version operations
  setRegionVersion: (regionId: string, version: number): void => {
    useEditorStore.getState().setRegionVersion(regionId, version);
  },

  getRegionVersion: (regionId: string): number => {
    return useEditorStore.getState().getRegionVersion(regionId);
  },

  // Pending edit operations for conflict protection
  isPendingEdit: (regionId: string, field?: string): boolean => {
    return useEditorStore.getState().isPendingEdit(regionId, field);
  },

  startPendingEdit: (regionId: string, field: string): void => {
    useEditorStore.getState().startPendingEdit(regionId, field);
  },

  endPendingEdit: (regionId: string, field: string): void => {
    useEditorStore.getState().endPendingEdit(regionId, field);
  },

  updatePendingEditActivity: (regionId: string, field: string): void => {
    useEditorStore.getState().updatePendingEditActivity(regionId, field);
  },

  // Conflict queue operations
  get conflictQueue() {
    return useEditorStore.getState().conflictQueue;
  },

  addConflictToQueue: (conflictData: ConflictDetail): void => {
    useEditorStore.getState().addConflictToQueue(conflictData);
  },

  removeConflictFromQueue: (conflictId: string): void => {
    useEditorStore.getState().removeConflictFromQueue(conflictId);
  },

  // Store access for region data
  regionById: (regionId: string): RegionData | null => {
    const state = useEditorStore.getState();
    return state.regionMap[regionId] || null;
  },

  canEdit: (): boolean => {
    return useEditorStore.getState().canEdit;
  },

  // Get baseline region state from pending edits (for conflict detection)
  getBaselineForRegion: (regionId: string): RegionData | LazyRegion | null => {
    const state = useEditorStore.getState();
    
    // Find baseline from any pending edit for this region
    for (const key in state.pendingEdits) {
      const edit = state.pendingEdits[key];
      if (edit.regionId === regionId && edit.baseline) {

        return edit.baseline as RegionData | LazyRegion;
      }
    }
    
    // Fallback to current region if no baseline found
    return state.regionMap[regionId] || null;
  }
}; 
