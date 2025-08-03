import { useEditorStore } from '../stores/useEditorStore';
import type { RegionData } from './adt';
import type { ConflictDetail } from './conflictDetectionService';

/**
 * Service wrapper for all Zustand store operations.
 * Treats application state as an I/O boundary to maintain clean architecture.
 * Consolidates all store access through one service.
 */
export const storeService = {
  // Editor Store operations
  // Region analysis operations
  setRegionAnalysis: (regionId: string, analysis: string[]): void => {
    useEditorStore.getState().setRegionAnalysis(regionId, analysis);
  },

  addKnownWords: (words: string[]): void => {
    useEditorStore.getState().addKnownWords(words);
  },

  getKnownWords: (): Set<string> => {
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

  // Version operations
  setRegionVersion: (regionId: string, version: number): void => {
    useEditorStore.getState().setRegionVersion(regionId, version);
  },

  getRegionVersion: (regionId: string): number => {
    return useEditorStore.getState().getRegionVersion(regionId);
  },

  // Pending edits operations
  isPendingEdit: (regionId: string, field?: string): boolean => {
    const state = useEditorStore.getState();
    return state.isPendingEdit(regionId, field);
  },

  startPendingEdit: (regionId: string, field: string): void => {
    const state = useEditorStore.getState();
    state.startPendingEdit(regionId, field);
  },

  endPendingEdit: (regionId: string, field: string): void => {
    const state = useEditorStore.getState();
    state.endPendingEdit(regionId, field);
  },

  updatePendingEditActivity: (regionId: string, field: string): void => {
    const state = useEditorStore.getState();
    state.updatePendingEditActivity(regionId, field);
  },

  // Conflict queue operations
  get conflictQueue() {
    return useEditorStore.getState().conflictQueue;
  },

  addConflictToQueue: (conflict: ConflictDetail): void => {
    useEditorStore.getState().addConflictToQueue(conflict);
  },

  removeConflictFromQueue: (conflictId: string): void => {
    useEditorStore.getState().removeConflictFromQueue(conflictId);
  },

  // Read operations
  regionById: (regionId: string): RegionData | null => {
    return useEditorStore.getState().regionById(regionId);
  },

  canEdit: (): boolean => {
    return useEditorStore.getState().canEdit;
  }
}; 