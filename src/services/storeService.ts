import { useEditorStore } from '../stores/useEditorStore';
import type { RegionData } from './adt';

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

  // Read operations
  regionById: (regionId: string): RegionData | null => {
    return useEditorStore.getState().regionById(regionId);
  },

  canEdit: (): boolean => {
    return useEditorStore.getState().canEdit;
  }
}; 