import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { TranscriptionData, RegionData, ProcessedIssue } from '../types/shared';
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
  selectedRegionId: string | null;
  selectedRegion: RegionData | null;
  playbackWithinRegion: string | null;

  // Known words for spell checking
  knownWords: Set<string>;

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
  setRegionText: (regionId: string, text: string) => void;
  setRegionTranslation: (regionId: string, translation: string) => void;
  updateRegionBounds: (regionId: string, start: number, end: number) => void;

  // Spell checking actions
  addKnownWords: (words: string[]) => void;
  setRegionAnalysis: (regionId: string, knownWords: string[]) => void;

  // Computed properties
  isVideo: boolean;
  isTranscriptionAuthor: (user: { username: string } | null) => boolean;
  transcriptionTitle: string | undefined;

  // Computed getters
  regionById: (id: string) => RegionData | null;
  issueById: (id: string) => ProcessedIssue | null;
  issuesByRegion: (regionId: string) => ProcessedIssue[];

  // Permissions
  setCanEdit: (canEdit: boolean) => void;
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
      selectedRegionId: null,
      selectedRegion: null,
      playbackWithinRegion: null,
      knownWords: new Set<string>(),
      issues: [],
      issueMap: {},
      _subscriptions: [],

      isTranscriptionAuthor: (user) => {
        const { transcription } = get();
        if (!transcription || !user) return false;
        return transcription.author === user.username;
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
        regions.forEach((region) => {
          regionMap[region.id] = region;
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
          knownWords: new Set<string>(),
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
        const { regions, regionMap } = get();
        
        // Add to regionMap for O(1) lookups
        const newRegionMap = { ...regionMap, [region.id]: region };
        
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
        });
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

      // Spell checking actions
      addKnownWords: (words) => {
        const { knownWords } = get();
        const newKnownWords = new Set(knownWords);
        words.forEach(word => newKnownWords.add(word));
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
    }),
    { name: 'EditorStore' }
  )
); 