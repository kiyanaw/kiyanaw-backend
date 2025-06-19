import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { DataStore } from '@aws-amplify/datastore';
import { Transcription, Region, Issue } from '../models';


interface EditorDataPayload {
  transcription: any;
  regions: any[];
  issues: any[];
  source?: string;
  peaks?: any;
  isVideo?: boolean;
}

interface EditorState {
  // Transcription state
  transcription: any | null;
  saved: boolean;
  peaks: any | null;

  // Regions state
  regions: any[];
  regionMap: Record<string, any>;
  selectedRegionId: string | null;
  selectedRegion: any | null;
  playbackWithinRegion: string | null;

  // Issues state
  issues: any[];
  issueMap: Record<string, any>;

  // Subscriptions
  _subscriptions: any[];

  // Actions
  setFullTranscriptionData: (data: EditorDataPayload, selectedRegionId?: string | null) => void;
  cleanup: () => void;
  
  // Transcription actions
  updateTranscription: (updates: Partial<any>) => Promise<void>;
  setTranscription: (transcription: any) => void;
  setSaved: (saved: boolean) => void;

  // Region actions
  setSelectedRegion: (regionId: string | null) => void;
  setPlaybackWithinRegion: (regionId: string | null) => void;
  updateRegion: (regionId: string, update: Partial<any>) => Promise<void>;
  createRegion: (regionData: any) => Promise<void>;
  deleteRegion: (regionId: string) => Promise<void>;
  addNewRegion: (region: any) => void;

  // Issue actions
  createIssue: (issueData: {
    text: string;
    type: string;
    owner: string;
    regionId?: string;
    resolved: boolean;
  }) => Promise<any>;
  updateIssue: (issueId: string, updates: Partial<any>) => Promise<void>;
  deleteIssue: (issueId: string) => Promise<void>;
  addComment: (issueId: string, comment: any) => Promise<void>;

  // Computed properties
  isVideo: boolean;
  isTranscriptionAuthor: (user: { username: string } | null) => boolean;
  transcriptionTitle: string | undefined;

  // Computed getters
  regionById: (id: string) => any | null;
  issueById: (id: string) => any | null;
  issuesByRegion: (regionId: string) => any[];
}
interface NewRegion {
  id: string;
  start: number;
  end: number;
  userLastUpdated: string;
  dateLastUpdated: string;
}

export const useEditorStore = create<EditorState>()(
  devtools(
    (set, get) => ({
      // Initial state
      transcription: null,
      saved: false,
      peaks: null,
      regions: [],
      regionMap: {},
      selectedRegionId: null,
      selectedRegion: null,
      playbackWithinRegion: null,
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
        const regionMap: Record<string, any> = {};
        regions.forEach((region) => {
          regionMap[region.id] = region;
        });

        // Process issues
        const issueMap: Record<string, any> = {};
        issues.forEach((issue) => {
          issueMap[issue.id] = issue;
        });

        // Set initial state
        const newState: any = {
          transcription,
          regions,
          regionMap,
          issues,
          issueMap,
          peaks: peaks
        };

        // If we have a selectedRegionId and it exists in our regions, set it as selected
        if (selectedRegionId && regionMap[selectedRegionId]) {
          newState.selectedRegionId = selectedRegionId;
          newState.selectedRegion = regionMap[selectedRegionId];
        }

        set(newState);
      },

      cleanup: () => {
        const { _subscriptions } = get();
        _subscriptions.forEach(sub => sub.unsubscribe());
        set({
          transcription: null,
          peaks: null,
          regions: [],
          regionMap: {},
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
          setTimeout(() => set({ saved: false }), 2000);
        }
      },

      updateTranscription: async (updates) => {
        const { transcription } = get();
        if (!transcription) return;

        try {
          const optimisticTranscription = { ...transcription, ...updates };
          set({ transcription: optimisticTranscription });

          const updated = await DataStore.save(
            Transcription.copyOf(transcription, (draft) => {
              Object.assign(draft, updates);
            })
          );

          set({ transcription: updated, saved: true });
        } catch (error) {
          console.error('Error updating transcription:', error);
          set({ transcription }); // Revert optimistic update on error
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

      updateRegion: async (regionId, update) => {
        try {
          const originalRegion = await DataStore.query(Region, regionId);
          if (!originalRegion) {
            console.error('Region not found in DataStore');
            return;
          }

          await DataStore.save(
            Region.copyOf(originalRegion, (draft) => {
              Object.assign(draft, update);
            })
          );
        } catch (error) {
          console.error('Error updating region:', error);
        }
      },

      createRegion: async (regionData) => {
        try {
          const { transcription } = get();
          if (!transcription) return;

          await DataStore.save(
            new Region({
              ...regionData,
              transcription,
              dateLastUpdated: `${+new Date()}`,
            })
          );
        } catch (error) {
          console.error('Error creating region:', error);
        }
      },

      deleteRegion: async (regionId) => {
        try {
          const { regionMap } = get();
          const region = regionMap[regionId];
          if (!region) return;

          await DataStore.delete(region);
        } catch (error) {
          console.error('Error deleting region:', error);
        }
      },

      addNewRegion: (region:NewRegion) => {
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

      // Issue actions
      createIssue: async (issueData) => {
        try {
          const { transcription } = get();
          if (!transcription) return;

          const existingIssues = await DataStore.query(Issue, (i: any) =>
            i.transcription.id.eq(transcription.id)
          );
          const nextIndex = existingIssues.length + 1;

          const newIssue = await DataStore.save(
            new Issue({
              text: issueData.text,
              type: issueData.type,
              owner: issueData.owner,
              resolved: issueData.resolved,
              index: nextIndex,
              regionId: issueData.regionId || '',
              transcription,
              comments: JSON.stringify([]),
            })
          );

          return newIssue;
        } catch (error) {
          console.error('Error creating issue:', error);
        }
      },

      updateIssue: async (issueId, updates) => {
        try {
          const { issueMap } = get();
          const issue = issueMap[issueId];
          if (!issue) return;

          await DataStore.save(
            Issue.copyOf(issue, (draft) => {
              Object.assign(draft, updates);
            })
          );

        } catch (error) {
          console.error('Error updating issue:', error);
        }
      },

      deleteIssue: async (issueId) => {
        try {
          const { issueMap } = get();
          const issue = issueMap[issueId];
          if (!issue) return;

          await DataStore.delete(issue);
        } catch (error) {
          console.error('Error deleting issue:', error);
        }
      },

      addComment: async (issueId, comment) => {
        try {
          const { issueMap } = get();
          const issue = issueMap[issueId];
          if (!issue) return;

          const comments = [...issue.comments, comment];
          await DataStore.save(
            Issue.copyOf(issue, (draft) => {
              draft.comments = JSON.stringify(comments);
            })
          );
        } catch (error) {
          console.error('Error adding comment:', error);
        }
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
    }),
    { name: 'EditorStore' }
  )
); 