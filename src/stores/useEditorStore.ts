import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { TranscriptionData, RegionData, ProcessedIssue } from '../types/shared';
import type { ConflictDetail } from '../services/conflictDetectionService';
import type { PendingEdit } from '../services/pendingEditsService';
import Timeout from 'smart-timeout';

interface EditorDataPayload {
  transcription: TranscriptionData;
  regions: RegionData[];
  issues: ProcessedIssue[];
  source?: string;
  peaks?: number[];
  isVideo?: boolean;
}

interface EditorState {
  // Transcription state
  transcription: TranscriptionData | null;
  saved: boolean;
  peaks: number[] | null;
  accessDenied: boolean;
  canEdit: boolean;

  // Regions state
  regions: RegionData[];
  regionMap: Record<string, RegionData>;
  regionVersions: Record<string, number>; // Track versions locally for conflict resolution
  selectedRegionId: string | null;
  selectedRegion: RegionData | null;
  playbackWithinRegion: string | null;
  
  // Word analysis cache
  knownWords: Set<string>;

  // Pending edits tracking
  pendingEdits: Record<string, PendingEdit>;

  // Conflict queue state
  conflictQueue: ConflictDetail[];

  // Issues state
  issues: ProcessedIssue[];
  issueMap: Record<string, ProcessedIssue>;

  // Subscriptions
  _subscriptions: { unsubscribe: () => void }[];

  // Actions
  setFullTranscriptionData: (data: EditorDataPayload, selectedRegionId?: string | null) => void;
  setAccessDenied: (denied: boolean) => void;
  cleanup: () => void;
  
  // Transcription actions
  setTranscription: (transcription: TranscriptionData) => void;
  setSaved: (saved: boolean) => void;

  // Region actions
  setSelectedRegion: (regionId: string | null) => void;
  setPlaybackWithinRegion: (regionId: string | null) => void;
  addNewRegion: (region: RegionData) => void;
  deleteRegion: (regionId: string) => void;
  setRegionText: (regionId: string, text: string) => void;
  setRegionTranslation: (regionId: string, translation: string) => void;
  updateRegionBounds: (regionId: string, start: number, end: number) => void;

  // Transcription metadata helpers
  calculateTranscriptionMetadata: () => { regionCount: number; coverage: number };

  // Spell checking actions
  addKnownWords: (words: string[]) => void;
  setRegionAnalysis: (regionId: string, knownWords: string[]) => void;

  // Pending edits actions moved below

  // Conflict queue actions
  addConflictToQueue: (conflict: ConflictDetail) => void;
  removeConflictFromQueue: (conflictId: string) => void;
  processConflictQueue: () => void;

  // Computed properties
  isVideo: boolean;
  isTranscriptionAuthor: (user: { username: string; userId: string } | null) => boolean;
  transcriptionTitle: string | undefined;

  // Computed getters
  regionById: (id: string) => RegionData | null;
  issueById: (id: string) => ProcessedIssue | null;
  issuesByRegion: (regionId: string) => ProcessedIssue[];
  getRegionVersion: (id: string) => number;
  setRegionVersion: (id: string, version: number) => void;
  isPendingEdit: (regionId: string, field?: string) => boolean;
  
  // Pending edit operations  
  startPendingEdit: (regionId: string, field: string) => void;
  endPendingEdit: (regionId: string, field: string) => void;
  updatePendingEditActivity: (regionId: string, field: string) => void;
}



export const useEditorStore = create<EditorState>()(
  devtools(
    (set, get) => ({
      // Initial state
      transcription: null,
      saved: false,
      peaks: null,
      accessDenied: false,
      canEdit: false,
      regions: [],
      regionMap: {},
      regionVersions: {},
      knownWords: new Set<string>(),
      pendingEdits: {},
      conflictQueue: [],
      issues: [],
      issueMap: {},
      _subscriptions: [],

      isTranscriptionAuthor: (user) => {
        const { transcription } = get();
        if (!transcription || !user) return false;
        return transcription.author === user.userId;
      },
      get transcriptionTitle() {
        return get().transcription?.title;
      },

      // Action to set data from TanStack Query
      setFullTranscriptionData: (data, selectedRegionId) => {
        const { transcription, regions, issues, peaks } = data;
        const state = get();
        state.cleanup();

        // Process regions
        const regionMap: Record<string, RegionData> = {};
        const regionVersions: Record<string, number> = {};
        regions.forEach((region) => {
          regionMap[region.id] = region;
          
          // Validate that existing regions from DB have versions
          if (region._version === undefined) {
            console.error('Region from DB missing _version:', region.id, region);
            throw new Error(`Region ${region.id} from database is missing _version field`);
          }
          
          regionVersions[region.id] = region._version;
        });

        // Process issues
        const issueMap: Record<string, ProcessedIssue> = {};
        issues.forEach((issue) => {
          issueMap[issue.id] = issue;
        });

        // Set initial state
        const newState: Partial<EditorState> = {
          transcription,
          regions,
          regionMap,
          regionVersions,
          issues,
          issueMap,
          peaks: peaks,
          knownWords: new Set<string>() // Will be populated by use-case
        };

        // If we have a selectedRegionId and it exists in our regions, set it as selected
        if (selectedRegionId && regionMap[selectedRegionId]) {
          newState.selectedRegionId = selectedRegionId;
          newState.selectedRegion = regionMap[selectedRegionId];
        }

        set(newState);
      },

      setAccessDenied: (denied) => {
        set({ accessDenied: denied });
      },

      setCanEdit: (canEdit) => {
        set({ canEdit });
      },

      cleanup: () => {
        const { _subscriptions } = get();
        _subscriptions.forEach(sub => sub.unsubscribe());
        set({
          transcription: null,
          peaks: null,
          accessDenied: false,
          regions: [],
          regionMap: {},
          regionVersions: {},
          knownWords: new Set<string>(),
          pendingEdits: {},
          conflictQueue: [],
          issues: [],
          issueMap: {},
          selectedRegionId: null,
          selectedRegion: null,
          playbackWithinRegion: null,
          _subscriptions: [],
        });
      },

      // Transcription actions
      setTranscription: (transcription) => set({ transcription }),
      
      setSaved: (saved) => {
        set({ saved });
        if (saved) {
          Timeout.set('editor-saved-reset', () => set({ saved: false }), 2000);
        }
      },



      // Region actions
      setSelectedRegion: (regionId) => {
        const { regionMap } = get();
        set({
          selectedRegionId: regionId,
          selectedRegion: regionId ? regionMap[regionId] : null,
        });
      },

      setPlaybackWithinRegion: (regionId) => {
        set({ playbackWithinRegion: regionId });
      },




      addNewRegion: (region: RegionData) => {
        const { regions, regionMap, regionVersions } = get();
        
        // Add to regionMap for O(1) lookups
        const newRegionMap = { ...regionMap, [region.id]: region };
        
        // Track version locally - regions from subscriptions/DB should have versions
        if (region._version === undefined) {
          console.error('Adding region without _version:', region.id, region);
          throw new Error(`Cannot add region ${region.id} without _version field`);
        }
        
        const newRegionVersions = { ...regionVersions, [region.id]: region._version };
        
        // Insert into regions array maintaining sort order (by start time)
        const newRegions = [...regions];
        const insertIndex = newRegions.findIndex(r => r.start > region.start);
        if (insertIndex === -1) {
          newRegions.push(region); // Add to end if it's the latest
        } else {
          newRegions.splice(insertIndex, 0, region); // Insert at correct position
        }
        
        set({
          regions: newRegions,
          regionMap: newRegionMap,
          regionVersions: newRegionVersions,
        });
      },

      deleteRegion: (regionId: string) => {
        const { regions, regionMap, regionVersions, selectedRegionId } = get();
        
        // Remove from regionMap
        const newRegionMap = { ...regionMap };
        delete newRegionMap[regionId];
        
        // Remove from regionVersions
        const newRegionVersions = { ...regionVersions };
        delete newRegionVersions[regionId];
        
        // Remove from regions array
        const newRegions = regions.filter(r => r.id !== regionId);
        
        // Prepare the update object
        const updateObj: Partial<EditorState> = {
          regions: newRegions,
          regionMap: newRegionMap,
          regionVersions: newRegionVersions,
        };
        
        // If this was the selected region, clear the selection
        if (selectedRegionId === regionId) {
          updateObj.selectedRegionId = null;
          updateObj.selectedRegion = null;
        }
        
        set(updateObj);
      },

      setRegionText: (regionId, text) => {
        const { regionMap, regions, selectedRegionId } = get();
        const existingRegion = regionMap[regionId];
        
        if (!existingRegion || existingRegion.regionText === text) {
          return; // No change needed
        }

        // Create updated region with new text
        const updatedRegion = { ...existingRegion, regionText: text };
        
        // Prepare the update object
        const updateObj: Partial<EditorState> = {
          regionMap: { ...regionMap, [regionId]: updatedRegion },
          regions: regions.map(r => r.id === regionId ? updatedRegion : r)
        };
        
        // If this is the currently selected region, update selectedRegion too
        if (selectedRegionId === regionId) {
          updateObj.selectedRegion = updatedRegion;
        }
        
        set(updateObj);
      },

      setRegionTranslation: (regionId, translation) => {
        const { regionMap, regions, selectedRegionId } = get();
        const existingRegion = regionMap[regionId];
        
        if (!existingRegion || existingRegion.translation === translation) {
          return; // No change needed
        }

        // Create updated region with new translation
        const updatedRegion = { ...existingRegion, translation };
        
        // Prepare the update object
        const updateObj: Partial<EditorState> = {
          regionMap: { ...regionMap, [regionId]: updatedRegion },
          regions: regions.map(r => r.id === regionId ? updatedRegion : r)
        };
        
        // If this is the currently selected region, update selectedRegion too
        if (selectedRegionId === regionId) {
          updateObj.selectedRegion = updatedRegion;
        }
        
        set(updateObj);
      },

      updateRegionBounds: (regionId, start, end) => {
        const { regionMap, regions, selectedRegionId } = get();
        const existingRegion = regionMap[regionId];
        
        if (!existingRegion || (existingRegion.start === start && existingRegion.end === end)) {
          return; // No change needed
        }

        // Create updated region with new bounds
        const updatedRegion = { ...existingRegion, start, end };
        
        // Update regionMap and regions array, then re-sort by start time
        const newRegions = regions.map(r => r.id === regionId ? updatedRegion : r);
        newRegions.sort((a, b) => a.start - b.start);
        
        // Prepare the update object
        const updateObj: Partial<EditorState> = {
          regionMap: { ...regionMap, [regionId]: updatedRegion },
          regions: newRegions
        };
        
        // If this is the currently selected region, update selectedRegion too
        if (selectedRegionId === regionId) {
          updateObj.selectedRegion = updatedRegion;
        }
        
        set(updateObj);
      },

      // Computed getters
      regionById: (id) => {
        const { regionMap } = get();
        return regionMap[id] || null;
      },

      issueById: (id) => {
        const { issueMap } = get();
        return issueMap[id] || null;
      },

      issuesByRegion: (regionId) => {
        const { issues } = get();
        return issues.filter(issue => issue.regionId === regionId);
      },

      getRegionVersion: (id) => {
        const { regionVersions } = get();
        const version = regionVersions[id];
        
        if (version === undefined) {
          throw new Error(`No version tracked for region ${id} - this indicates a data integrity issue`);
        }
        
        return version;
      },

      setRegionVersion: (id, version) => {
        const { regionVersions } = get();
        set({
          regionVersions: { ...regionVersions, [id]: version }
        });
      },

      // Pending edit operations use startPendingEdit/endPendingEdit below

      isPendingEdit: (regionId, field) => {
        const { pendingEdits } = get();
        
        if (field) {
          const key = `${regionId}:${field}`;
          return key in pendingEdits;
        }
        
        // Check if ANY field for this region is being edited
        for (const key in pendingEdits) {
          if (pendingEdits[key].regionId === regionId) {
            return true;
          }
        }
        
        return false;
      },

      // Pending edits actions
      startPendingEdit: (regionId, field) => {
        const { pendingEdits, regionMap } = get();
        const key = `${regionId}:${field}`;
        const now = new Date();
        
        // Capture baseline region state for conflict detection
        const baseline = regionMap[regionId] ? { ...regionMap[regionId] } : null;
        
        const newPendingEdits = {
          ...pendingEdits,
          [key]: {
            regionId,
            field: field as PendingEdit['field'],
            startedAt: now,
            lastActivity: now,
            baseline, // Store original state when edit started
          },
        };
        
        set({ pendingEdits: newPendingEdits });
      },

      endPendingEdit: (regionId, field) => {
        const { pendingEdits } = get();
        const key = `${regionId}:${field}`;
        
        const newPendingEdits = { ...pendingEdits };
        delete newPendingEdits[key];
        
        set({ pendingEdits: newPendingEdits });
      },

      updatePendingEditActivity: (regionId, field) => {
        const { pendingEdits } = get();
        const key = `${regionId}:${field}`;
        const existing = pendingEdits[key];
        
        if (existing) {
          const newPendingEdits = {
            ...pendingEdits,
            [key]: {
              ...existing,
              lastActivity: new Date(),
            },
          };
          
          set({ pendingEdits: newPendingEdits });
        }
      },

      // Conflict queue actions
      addConflictToQueue: (conflict) => {
        const { conflictQueue } = get();
        const newQueue = [...conflictQueue, conflict];
        set({ conflictQueue: newQueue });
      },

      removeConflictFromQueue: (conflictId) => {
        const { conflictQueue } = get();
        const newQueue = conflictQueue.filter(c => c.conflictId !== conflictId);
        set({ conflictQueue: newQueue });
      },

      processConflictQueue: () => {
        const { conflictQueue } = get();
        // For now, just log the conflicts - actual processing will be implemented in Phase 4
        console.log('Processing conflict queue:', conflictQueue);
        // TODO: Implement actual conflict processing logic in Phase 4
      },

      // Spell checking actions
      addKnownWords: (words) => {
        const { knownWords } = get();
        const newKnownWords = new Set(knownWords);
        words.forEach(word => {
          newKnownWords.add(word);
        });
        set({ knownWords: newKnownWords });
      },

      setRegionAnalysis: (regionId, knownWords) => {
        const { regionMap, regions, selectedRegionId } = get();
        const existingRegion = regionMap[regionId];
        
        if (!existingRegion) {
          return; // Region not found
        }

        // Create updated region with new analysis
        const updatedRegion = { ...existingRegion, regionAnalysis: knownWords };
        
        // Prepare the update object
        const updateObj: Partial<EditorState> = {
          regionMap: { ...regionMap, [regionId]: updatedRegion },
          regions: regions.map(r => r.id === regionId ? updatedRegion : r)
        };
        
        // If this is the currently selected region, update selectedRegion too
        if (selectedRegionId === regionId) {
          updateObj.selectedRegion = updatedRegion;
        }
        
        set(updateObj);
      },

      // Transcription metadata helpers
      calculateTranscriptionMetadata: () => {
        const { regions, transcription } = get();
        
        const regionCount = regions.length;
        
        // Calculate coverage: last region end / total transcription length
        let coverage = 0;
        if (regions.length > 0 && transcription?.length) {
          // Find the latest end time among all regions
          const lastRegionEnd = Math.max(...regions.map(r => r.end));
          coverage = Math.min(lastRegionEnd / transcription.length, 1.0); // Cap at 1.0
        }
        
        return { regionCount, coverage };
      },
    }),
    { name: 'EditorStore' }
  )
); 