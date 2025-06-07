import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { DataStore } from '@aws-amplify/datastore';
import { Transcription, Region, Issue } from '../models';
import { eventBus } from '../lib/eventBus';

interface EditorState {
  // Transcription state
  transcription: any | null;
  loading: boolean;
  error: string | null;
  saved: boolean;

  // Regions state
  regions: any[];
  regionMap: Record<string, any>;
  selectedRegionId: string | null;
  selectedRegion: any | null;

  // Issues state
  issues: any[];
  issueMap: Record<string, any>;

  // Subscriptions
  _subscriptions: any[];

  // Actions
  loadData: (transcriptionId: string) => Promise<void>;
  cleanup: () => void;
  
  // Transcription actions
  updateTranscription: (updates: Partial<any>) => Promise<void>;
  setTranscription: (transcription: any) => void;
  setSaved: (saved: boolean) => void;

  // Region actions
  setSelectedRegion: (regionId: string | null) => void;
  updateRegion: (regionId: string, update: Partial<any>) => Promise<void>;
  createRegion: (regionData: any) => Promise<void>;
  deleteRegion: (regionId: string) => Promise<void>;

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

  // Computed getters
  regionById: (id: string) => any | null;
  issueById: (id: string) => any | null;
  issuesByRegion: (regionId: string) => any[];
}

export const useEditorStore = create<EditorState>()(
  devtools(
    (set, get) => ({
      // Initial state
      transcription: null,
      loading: false,
      error: null,
      saved: false,
      regions: [],
      regionMap: {},
      selectedRegionId: null,
      selectedRegion: null,
      issues: [],
      issueMap: {},
      _subscriptions: [],

      // Load all data for a transcription
      loadData: async (transcriptionId: string) => {
        const state = get();
        state.cleanup();
        
        set({ loading: true, error: null });
        
        try {
          // Load transcription
          const transcription = await DataStore.query(Transcription, transcriptionId);
          if (!transcription) {
            throw new Error('Transcription not found');
          }

          // Load peaks data if available
          let transcriptionWithPeaks: any = transcription;
          try {
            const peaksResponse = await fetch(`${transcription.source}.json`);
            const peaksData = await peaksResponse.json();
            transcriptionWithPeaks = { ...transcription, peaks: peaksData };
          } catch (error) {
            console.error('Error loading peaks data:', error);
            eventBus.emit('on-load-peaks-error');
          }

          // Load regions and issues
          const [regions, issues] = await Promise.all([
            DataStore.query(Region, (r) => r.transcription.id.eq(transcriptionId)),
            DataStore.query(Issue, (i) => i.transcription.id.eq(transcriptionId))
          ]);

          // Process regions
          const processedRegions = regions
            .slice()
            .sort((a, b) => (a.start > b.start ? 1 : -1))
            .map((item, index) => ({
              ...item,
              index,
              displayIndex: item.isNote ? 0 : index + 1,
            }));

          const regionMap: Record<string, any> = {};
          processedRegions.forEach((region) => {
            regionMap[region.id] = region;
          });

          // Process issues with comments
          const processedIssues = issues.map((issue: any) => {
            let comments = [];
            try {
              comments = issue.comments ? JSON.parse(issue.comments) : [];
            } catch (e) {
              console.warn('Failed to parse comments for issue:', issue.id);
              comments = [];
            }
            return {
              ...issue,
              comments: comments.sort(
                (a: any, b: any) =>
                  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              ),
            };
          }).sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          const issueMap: Record<string, any> = {};
          processedIssues.forEach((issue) => {
            issueMap[issue.id] = issue;
          });

          // Set up subscriptions
          const subscriptions = [
            // Transcription subscription
            DataStore.observe(Transcription, transcriptionId).subscribe((message) => {
              if (message.opType === 'UPDATE') {
                set({ transcription: message.element });
                eventBus.emit('transcription-updated', message.element);
              }
            }),

            // Regions subscription
            DataStore.observeQuery(Region, (r) => r.transcription.id.eq(transcriptionId)).subscribe((snapshot) => {
              const newRegions = snapshot.items
                .slice()
                .sort((a, b) => (a.start > b.start ? 1 : -1))
                .map((item, index) => ({
                  ...item,
                  index,
                  displayIndex: item.isNote ? 0 : index + 1,
                }));

              const newRegionMap: Record<string, any> = {};
              newRegions.forEach((region) => {
                newRegionMap[region.id] = region;
              });

              set((state) => ({
                regions: newRegions,
                regionMap: newRegionMap,
                selectedRegion: state.selectedRegionId ? newRegionMap[state.selectedRegionId] : null,
              }));
            }),

            // Issues subscription
            DataStore.observeQuery(Issue, (i) => i.transcription.id.eq(transcriptionId)).subscribe((snapshot) => {
              const newIssues = snapshot.items.map((issue: any) => {
                let comments = [];
                try {
                  comments = issue.comments ? JSON.parse(issue.comments) : [];
                } catch (e) {
                  console.warn('Failed to parse comments for issue:', issue.id);
                  comments = [];
                }
                return {
                  ...issue,
                  comments: comments.sort(
                    (a: any, b: any) =>
                      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                  ),
                };
              }).sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );

              const newIssueMap: Record<string, any> = {};
              newIssues.forEach((issue) => {
                newIssueMap[issue.id] = issue;
              });

              set({ issues: newIssues, issueMap: newIssueMap });
            })
          ];

          set({
            transcription: transcriptionWithPeaks,
            regions: processedRegions,
            regionMap,
            issues: processedIssues,
            issueMap,
            _subscriptions: subscriptions,
            loading: false
          });

          eventBus.emit('transcription-ready');
          eventBus.emit('transcription-loaded', transcriptionWithPeaks);

        } catch (error) {
          console.error('Error loading editor data:', error);
          set({ error: 'Failed to load transcription data', loading: false });
        }
      },

      cleanup: () => {
        const { _subscriptions } = get();
        _subscriptions.forEach(sub => sub.unsubscribe());
        set({ _subscriptions: [] });
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
          eventBus.emit('transcription-updated', updated);
        } catch (error) {
          console.error('Error updating transcription:', error);
          set({ error: 'Failed to update transcription', transcription });
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

      updateRegion: async (regionId, update) => {
        try {
          const originalRegion = await DataStore.query(Region, regionId);
          if (!originalRegion) {
            set({ error: 'Region not found in DataStore' });
            return;
          }

          await DataStore.save(
            Region.copyOf(originalRegion, (draft) => {
              Object.assign(draft, update);
            })
          );
        } catch (error) {
          console.error('Error updating region:', error);
          set({ error: 'Failed to update region' });
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
          set({ error: 'Failed to create region' });
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
          set({ error: 'Failed to delete region' });
        }
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

          eventBus.emit('issue-created', newIssue);
          return newIssue;
        } catch (error) {
          console.error('Error creating issue:', error);
          set({ error: 'Failed to create issue' });
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

          eventBus.emit('issue-updated', issue);
        } catch (error) {
          console.error('Error updating issue:', error);
          set({ error: 'Failed to update issue' });
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
          set({ error: 'Failed to delete issue' });
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
          set({ error: 'Failed to add comment' });
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