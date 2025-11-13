import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { TranscriptionData, RegionData } from '../types/shared';
import type { IssueData, CommentData } from '../services/adt';
import type { WordAnalysis } from '../services/spellCheckerService';

const isWordAnalysis = (value: unknown): value is WordAnalysis => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'word' in value &&
    typeof (value as { word: unknown }).word === 'string'
  );
};
import type { ConflictDetail } from '../services/conflictDetectionService';
import type { PendingEdit } from '../services/pendingEditsService';
import Timeout from 'smart-timeout';

interface EditorDataPayload {
  transcription: TranscriptionData;
  regions: RegionData[];
  issues: IssueData[];
  comments: CommentData[];
  source?: string;
  peaks?: number[];
  isVideo?: boolean;
}

interface EditorState {
  // Transcription state
  transcription: TranscriptionData | null;
  saved: boolean;
  saveStatus: 'saved' | 'saving' | 'error';
  peaks: number[] | null;
  wavesurferError: string | null;
  accessDenied: boolean;
  canEdit: boolean;

  // Regions state
  regions: RegionData[];
  regionMap: Record<string, RegionData>;
  regionVersions: Record<string, number>; // Track versions locally for conflict resolution
  selectedRegionId: string | null;
  selectedRegion: RegionData | null;
  playbackWithinRegion: string | null;
  // Issue selection (for deep-linking to a conversation)
  selectedIssueId?: string | null;
  
  // Text selection state for creating issues
  regionSelections: Record<string, { index: number; length: number; text: string } | null>;
  
  // Word analysis cache - stores full WordAnalysis objects, not just strings
  knownWords: Map<string, import('../services/spellCheckerService').WordAnalysis>;

  // Pending edits tracking
  pendingEdits: Record<string, PendingEdit>;

  // Conflict queue state
  conflictQueue: ConflictDetail[];

  // Issues state
  issues: IssueData[];
  issueMap: Record<string, IssueData>;
  issuesByRegionMap: Record<string, IssueData[]>; // regionId -> issues[]

  // Comments state
  comments: CommentData[];
  commentMap: Record<string, CommentData>;
  commentsByEntityMap: Record<string, CommentData[]>; // entityId -> comments[]
  commentsByTranscriptionMap: CommentData[]; // transcription-level comments

  // Issue link status tracking
  issueLinkStatusesByRegion: Record<string, Record<string, 'matched' | 'unmatched'>>; // regionId -> issueId -> status
  issueSuggestionsByRegion: Record<string, Record<string, Array<{ token: string; start: number; end: number; score: number }>>>; // regionId -> issueId -> suggestions

  // Subscriptions
  _subscriptions: { unsubscribe: () => void }[];

  // Actions
  setFullTranscriptionData: (data: EditorDataPayload, selectedRegionId?: string | null) => void;
  setAccessDenied: (denied: boolean) => void;
  setWavesurferError: (error: string | null) => void;
  cleanup: () => void;
  
  // Transcription actions
  setTranscription: (transcription: TranscriptionData) => void;
  setSaved: (saved: boolean) => void;
  setSaveStatus: (status: 'saved' | 'saving' | 'error') => void;

  // Region actions
  setSelectedRegion: (regionId: string | null) => void;
  setSelectedIssueId?: (issueId: string | null) => void;
  setPlaybackWithinRegion: (regionId: string | null) => void;
  setRegionSelection: (regionId: string, selection: { index: number; length: number; text: string } | null) => void;
  addNewRegion: (region: RegionData) => void;
  deleteRegion: (regionId: string) => void;
  setRegionText: (regionId: string, text: string) => void;
  setRegionTranslation: (regionId: string, translation: string) => void;
  updateRegionBounds: (regionId: string, start: number, end: number) => void;

  // Issue actions
  addNewIssue: (issue: IssueData) => void;
  updateIssue: (issueId: string, updates: Partial<IssueData>) => void;
  deleteIssue: (issueId: string) => void;

  // Comment actions
  addNewComment: (comment: CommentData) => void;
  updateComment: (commentId: string, updates: Partial<CommentData>) => void;
  deleteComment: (commentId: string) => void;

  // Issue link status actions
  setIssueLinkStatuses: (regionId: string, statuses: Record<string, 'matched' | 'unmatched'>) => void;
  setIssueSuggestions: (regionId: string, suggestions: Record<string, Array<{ token: string; start: number; end: number; score: number }>>) => void;
  clearIssueSuggestionsForIssue: (issueId: string) => void;

  // Transcription metadata helpers
  calculateTranscriptionMetadata: () => { regionCount: number; issueCount: number; coverage: number };

  // Spell checking actions
  addKnownWords: (words: import('../services/spellCheckerService').WordAnalysis[]) => void;
  setRegionAnalysis: (regionId: string, analysis: import('../services/spellCheckerService').WordAnalysis[]) => void;

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
  issueById: (id: string) => IssueData | null;
  issuesByRegion: (regionId: string) => IssueData[];
  getIssuesForRegion: (regionId: string) => IssueData[];
  commentById: (id: string) => CommentData | null;
  commentsByEntity: (entityId: string) => CommentData[];
  commentsByRegion: (regionId: string) => CommentData[];
  commentsByIssue: (issueId: string) => CommentData[];
  commentsByTranscription: () => CommentData[];
  getCommentsForEntity: (entityId: string) => CommentData[];
  getRegionVersion: (id: string) => number;
  setRegionVersion: (id: string, version: number) => void;
  isPendingEdit: (regionId: string, field?: string) => boolean;
  
  // Pending edit operations  
  startPendingEdit: (regionId: string, field: string) => void;
  endPendingEdit: (regionId: string, field: string) => void;
  updatePendingEditActivity: (regionId: string, field: string) => void;
}



// Stable empty arrays to prevent unnecessary re-renders
const EMPTY_ISSUES_ARRAY: IssueData[] = [];
const EMPTY_COMMENTS_ARRAY: CommentData[] = [];

export const useEditorStore = create<EditorState>()(
  devtools(
    (set, get) => ({
      // Initial state
      transcription: null,
      saved: false,
      saveStatus: 'saved',
      peaks: null,
      wavesurferError: null,
      accessDenied: false,
      canEdit: false,
      regions: [],
      regionMap: {},
      regionVersions: {},
      selectedIssueId: null,
      regionSelections: {},
      knownWords: new Map(),
      pendingEdits: {},
      conflictQueue: [],
      issues: [],
      issueMap: {},
      issuesByRegionMap: {},

      comments: [],
      commentMap: {},
      commentsByEntityMap: {},
      commentsByTranscriptionMap: [],
      
      // Issue link status initial state
      issueLinkStatusesByRegion: {},
      issueSuggestionsByRegion: {},
      
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
        const { transcription, regions, issues, comments, peaks } = data;
        const state = get();
        state.cleanup();

        // Process regions
        const regionMap: Record<string, RegionData> = {};
        const regionVersions: Record<string, number> = {};
        regions.forEach((region) => {
          // Filter out empty analysis (WordAnalysis objects with empty analysis field)
          // These are incomplete and should be re-analyzed
          if (region.regionAnalysis && Array.isArray(region.regionAnalysis)) {
            const hasEmptyAnalysis = region.regionAnalysis.some((item) => {
              if (!isWordAnalysis(item)) {
                return false;
              }

              const primaryAnalysisMissing = typeof item.analysis !== 'string' || item.analysis.trim() === '';
              const allAnalysesMissing = !Array.isArray(item.allAnalysis) || item.allAnalysis.length === 0;

              return primaryAnalysisMissing || allAnalysesMissing;
            });
            
            if (hasEmptyAnalysis) {
              console.log(`🧹 STORE: Clearing incomplete regionAnalysis for ${region.id} (has empty analysis fields)`);
              region.regionAnalysis = [];
            }
          }
          
          regionMap[region.id] = region;
          
          // Validate that existing regions from DB have versions
          if (region._version === undefined) {
            console.error('Region from DB missing _version:', region.id, region);
            throw new Error(`Region ${region.id} from database is missing _version field`);
          }
          
          regionVersions[region.id] = region._version;
        });

        // Process issues
        const issueMap: Record<string, IssueData> = {};
        const issuesByRegionMap: Record<string, IssueData[]> = {};
        
        issues.forEach((issue) => {
          issueMap[issue.id] = issue;
          
          // Group issues by regionId for efficient lookup
          if (!issuesByRegionMap[issue.regionId]) {
            issuesByRegionMap[issue.regionId] = [];
          }
          issuesByRegionMap[issue.regionId].push(issue);
        });

        // Process comments
        const commentMap: Record<string, CommentData> = {};
        const commentsByEntityMap: Record<string, CommentData[]> = {};
        const commentsByTranscriptionMap: CommentData[] = [];
        
        comments.forEach((comment) => {
          commentMap[comment.id] = comment;
          
          // Group comments by entityId for efficient lookup
          if (!commentsByEntityMap[comment.entityId]) {
            commentsByEntityMap[comment.entityId] = [];
          }
          commentsByEntityMap[comment.entityId].push(comment);
          
          // Separate transcription-level comments
          if (comment.entityType === 'transcription') {
            commentsByTranscriptionMap.push(comment);
          }
        });

        // Set initial state
        const newState: Partial<EditorState> = {
          transcription,
          regions,
          regionMap,
          regionVersions,
          issues,
          issueMap,
          issuesByRegionMap,
          comments,
          commentMap,
          commentsByEntityMap,
          commentsByTranscriptionMap,
          peaks: peaks,
          knownWords: new Map() // Will be populated by use-case
        };

        // If we have a selectedRegionId and it exists in our regions, set it as selected
        if (selectedRegionId && regionMap[selectedRegionId]) {
          const region = regionMap[selectedRegionId];
          newState.selectedRegionId = selectedRegionId;
          newState.selectedRegion = region;
          
          console.log(`🎯 STORE: Initial region selection (from URL) ${selectedRegionId}:`, {
            id: region.id,
            hasRegionAnalysis: !!region.regionAnalysis,
            regionAnalysisType: typeof region.regionAnalysis,
            regionAnalysisIsArray: Array.isArray(region.regionAnalysis),
            regionAnalysisLength: Array.isArray(region.regionAnalysis) ? region.regionAnalysis.length : 'N/A',
            firstItem: Array.isArray(region.regionAnalysis) && region.regionAnalysis.length > 0 ? region.regionAnalysis[0] : undefined,
            regionAnalysis: region.regionAnalysis
          });
        }

        set(newState);
      },

      setAccessDenied: (denied) => {
        set({ accessDenied: denied });
      },

      setWavesurferError: (error: string | null) => {
        set({ wavesurferError: error });
      },

      setCanEdit: (canEdit: boolean) => {
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
          knownWords: new Map(),
          pendingEdits: {},
          conflictQueue: [],
          issues: [],
          issueMap: {},
          issuesByRegionMap: {},
          comments: [],
          commentMap: {},
          commentsByEntityMap: {},
          commentsByTranscriptionMap: [],
          selectedRegionId: null,
          selectedRegion: null,
          playbackWithinRegion: null,
          regionSelections: {},
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

      setSaveStatus: (status) => {
        set({ saveStatus: status });
      },



      // Region actions
      setSelectedRegion: (regionId) => {
        const { regionMap } = get();
        const region = regionId ? regionMap[regionId] : null;
        
        if (region) {
          console.log(`🎯 STORE: Selected region ${regionId}:`, {
            id: region.id,
            hasRegionAnalysis: !!region.regionAnalysis,
            regionAnalysisType: typeof region.regionAnalysis,
            regionAnalysisIsArray: Array.isArray(region.regionAnalysis),
            regionAnalysisLength: Array.isArray(region.regionAnalysis) ? region.regionAnalysis.length : 'N/A',
            firstItem: Array.isArray(region.regionAnalysis) && region.regionAnalysis.length > 0 ? region.regionAnalysis[0] : undefined,
            regionAnalysis: region.regionAnalysis
          });
        }
        
        set({
          selectedRegionId: regionId,
          selectedRegion: region,
        });
      },

      setSelectedIssueId: (issueId) => {
        set({ selectedIssueId: issueId ?? null });
      },

      setPlaybackWithinRegion: (regionId) => {
        set({ playbackWithinRegion: regionId });
      },

      setRegionSelection: (regionId, selection) => {
        const { regionSelections } = get();
        set({
          regionSelections: {
            ...regionSelections,
            [regionId]: selection
          }
        });
      },




      addNewRegion: (region: RegionData) => {
        const { regions, regionMap, regionVersions } = get();
        
        // Add to regionMap for O(1) lookups
        const newRegionMap = { ...regionMap, [region.id]: region };
        
        // Track version locally
        // New regions (from UI) don't have _version yet, assign temporary version 0
        // Existing regions (from subscriptions/DB) should have _version
        let version = region._version;
        if (version === undefined) {
          console.log('📝 Adding new region without _version (will be updated from subscription):', region.id);
          version = 0; // Temporary version for new regions
        }

        const newRegionVersions = { ...regionVersions, [region.id]: version };
        
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

      // Issue actions
      addNewIssue: (issue: IssueData) => {
        const { issues, issueMap, issuesByRegionMap } = get();
        
        // Add to issues array
        const newIssues = [...issues, issue];
        
        // Add to issueMap
        const newIssueMap = { ...issueMap, [issue.id]: issue };
        
        // Add to issuesByRegionMap
        const newIssuesByRegionMap = { ...issuesByRegionMap };
        if (!newIssuesByRegionMap[issue.regionId]) {
          newIssuesByRegionMap[issue.regionId] = [];
        }
        newIssuesByRegionMap[issue.regionId] = [...newIssuesByRegionMap[issue.regionId], issue];
        
        set({
          issues: newIssues,
          issueMap: newIssueMap,
          issuesByRegionMap: newIssuesByRegionMap,
        });
      },

      updateIssue: (issueId: string, updates: Partial<IssueData>) => {
        const { issues, issueMap } = get();
        const existingIssue = issueMap[issueId];
        
        if (!existingIssue) {
          console.warn(`Attempted to update non-existent issue: ${issueId}`);
          return;
        }

        // Create updated issue
        const updatedIssue = { ...existingIssue, ...updates };
        
        // Update issues array
        const newIssues = issues.map(issue => 
          issue.id === issueId ? updatedIssue : issue
        );
        
        // Update issueMap
        const newIssueMap = { ...issueMap, [issueId]: updatedIssue };
        
        // Rebuild issuesByRegionMap (in case regionId changed)
        const newIssuesByRegionMap: Record<string, IssueData[]> = {};
        newIssues.forEach((issue) => {
          if (!newIssuesByRegionMap[issue.regionId]) {
            newIssuesByRegionMap[issue.regionId] = [];
          }
          newIssuesByRegionMap[issue.regionId].push(issue);
        });
        
        set({
          issues: newIssues,
          issueMap: newIssueMap,
          issuesByRegionMap: newIssuesByRegionMap,
        });
      },

      deleteIssue: (issueId: string) => {
        const { issues, issueMap } = get();
        
        // Remove from issues array
        const newIssues = issues.filter(issue => issue.id !== issueId);
        
        // Remove from issueMap
        const newIssueMap = { ...issueMap };
        delete newIssueMap[issueId];
        
        // Rebuild issuesByRegionMap
        const newIssuesByRegionMap: Record<string, IssueData[]> = {};
        newIssues.forEach((issue) => {
          if (!newIssuesByRegionMap[issue.regionId]) {
            newIssuesByRegionMap[issue.regionId] = [];
          }
          newIssuesByRegionMap[issue.regionId].push(issue);
        });
        
        set({
          issues: newIssues,
          issueMap: newIssueMap,
          issuesByRegionMap: newIssuesByRegionMap,
        });
      },

      // Comment actions
      addNewComment: (comment: CommentData) => {
        const { comments, commentMap, commentsByEntityMap, commentsByTranscriptionMap, issueMap, issues } = get();
        
        // Add to comments array
        const newComments = [...comments, comment];
        
        // Add to commentMap
        const newCommentMap = { ...commentMap, [comment.id]: comment };
        
        // Add to commentsByEntityMap
        const newCommentsByEntityMap = { ...commentsByEntityMap };
        if (!newCommentsByEntityMap[comment.entityId]) {
          newCommentsByEntityMap[comment.entityId] = [];
        }
        newCommentsByEntityMap[comment.entityId] = [...newCommentsByEntityMap[comment.entityId], comment];
        
        // Update commentsByTranscriptionMap if it's a transcription-level comment
        let newCommentsByTranscriptionMap = commentsByTranscriptionMap;
        if (comment.entityType === 'transcription') {
          newCommentsByTranscriptionMap = [...commentsByTranscriptionMap, comment];
        }
        
        // If this is an issue comment, update the issue's comment count by counting
        let newIssues = issues;
        let newIssueMap = issueMap;
        let newIssuesByRegionMap = get().issuesByRegionMap;
        if (comment.entityType === 'issue') {
          const issue = issueMap[comment.entityId];
          if (issue) {
            // Count all comments for this issue after adding the new one
            const issueComments = newCommentsByEntityMap[comment.entityId] || [];
            const actualCount = issueComments.length;
            const updatedIssue = { ...issue, commentCount: actualCount };
            newIssueMap = { ...issueMap, [issue.id]: updatedIssue };
            newIssues = issues.map(i => i.id === issue.id ? updatedIssue : i);
            
            // Update issuesByRegionMap
            newIssuesByRegionMap = { ...newIssuesByRegionMap };
            if (newIssuesByRegionMap[issue.regionId]) {
              newIssuesByRegionMap[issue.regionId] = newIssuesByRegionMap[issue.regionId].map(
                i => i.id === issue.id ? updatedIssue : i
              );
            }
          }
        }
        
        set({
          comments: newComments,
          commentMap: newCommentMap,
          commentsByEntityMap: newCommentsByEntityMap,
          commentsByTranscriptionMap: newCommentsByTranscriptionMap,
          issues: newIssues,
          issueMap: newIssueMap,
          issuesByRegionMap: newIssuesByRegionMap,
        });
      },

      updateComment: (commentId: string, updates: Partial<CommentData>) => {
        const { comments, commentMap, commentsByEntityMap, commentsByTranscriptionMap } = get();
        const existingComment = commentMap[commentId];
        
        if (!existingComment) {
          console.warn(`Attempted to update non-existent comment: ${commentId}`);
          return;
        }

        // Create updated comment
        const updatedComment = { ...existingComment, ...updates };
        
        // Update comments array
        const newComments = comments.map(comment => 
          comment.id === commentId ? updatedComment : comment
        );
        
        // Update commentMap
        const newCommentMap = { ...commentMap, [commentId]: updatedComment };
        
        // Update commentsByEntityMap
        const newCommentsByEntityMap = { ...commentsByEntityMap };
        if (newCommentsByEntityMap[updatedComment.entityId]) {
          newCommentsByEntityMap[updatedComment.entityId] = newCommentsByEntityMap[updatedComment.entityId].map(
            comment => comment.id === commentId ? updatedComment : comment
          );
        }
        
        // Update commentsByTranscriptionMap if needed
        let newCommentsByTranscriptionMap = commentsByTranscriptionMap;
        if (updatedComment.entityType === 'transcription') {
          newCommentsByTranscriptionMap = commentsByTranscriptionMap.map(
            comment => comment.id === commentId ? updatedComment : comment
          );
        }
        
        set({
          comments: newComments,
          commentMap: newCommentMap,
          commentsByEntityMap: newCommentsByEntityMap,
          commentsByTranscriptionMap: newCommentsByTranscriptionMap,
        });
      },

      deleteComment: (commentId: string) => {
        const { comments, commentMap, commentsByEntityMap, commentsByTranscriptionMap, issueMap, issues } = get();
        const existingComment = commentMap[commentId];
        
        if (!existingComment) {
          console.warn(`Attempted to delete non-existent comment: ${commentId}`);
          return;
        }
        
        // Remove from comments array
        const newComments = comments.filter(comment => comment.id !== commentId);
        
        // Remove from commentMap
        const newCommentMap = { ...commentMap };
        delete newCommentMap[commentId];
        
        // Update commentsByEntityMap
        const newCommentsByEntityMap = { ...commentsByEntityMap };
        if (newCommentsByEntityMap[existingComment.entityId]) {
          newCommentsByEntityMap[existingComment.entityId] = newCommentsByEntityMap[existingComment.entityId].filter(
            comment => comment.id !== commentId
          );
        }
        
        // Update commentsByTranscriptionMap if needed
        let newCommentsByTranscriptionMap = commentsByTranscriptionMap;
        if (existingComment.entityType === 'transcription') {
          newCommentsByTranscriptionMap = commentsByTranscriptionMap.filter(
            comment => comment.id !== commentId
          );
        }
        
        // If this was an issue comment, update the issue's comment count by counting
        let newIssues = issues;
        let newIssueMap = issueMap;
        let newIssuesByRegionMap = get().issuesByRegionMap;
        if (existingComment.entityType === 'issue') {
          const issue = issueMap[existingComment.entityId];
          if (issue) {
            // Count remaining comments for this issue after deletion
            const remainingComments = newCommentsByEntityMap[existingComment.entityId] || [];
            const actualCount = remainingComments.length;
            const updatedIssue = { ...issue, commentCount: actualCount };
            newIssueMap = { ...issueMap, [issue.id]: updatedIssue };
            newIssues = issues.map(i => i.id === issue.id ? updatedIssue : i);
            
            // Update issuesByRegionMap
            newIssuesByRegionMap = { ...newIssuesByRegionMap };
            if (newIssuesByRegionMap[issue.regionId]) {
              newIssuesByRegionMap[issue.regionId] = newIssuesByRegionMap[issue.regionId].map(
                i => i.id === issue.id ? updatedIssue : i
              );
            }
          }
        }
        
        set({
          comments: newComments,
          commentMap: newCommentMap,
          commentsByEntityMap: newCommentsByEntityMap,
          commentsByTranscriptionMap: newCommentsByTranscriptionMap,
          issues: newIssues,
          issueMap: newIssueMap,
          issuesByRegionMap: newIssuesByRegionMap,
        });
      },

      // Issue link status actions
      setIssueLinkStatuses: (regionId: string, statuses: Record<string, 'matched' | 'unmatched'>) => {
        const { issueLinkStatusesByRegion } = get();
        set({
          issueLinkStatusesByRegion: {
            ...issueLinkStatusesByRegion,
            [regionId]: statuses
          }
        });
      },

      setIssueSuggestions: (regionId: string, suggestions: Record<string, Array<{ token: string; start: number; end: number; score: number }>>) => {
        const { issueSuggestionsByRegion } = get();
        set({
          issueSuggestionsByRegion: {
            ...issueSuggestionsByRegion,
            [regionId]: suggestions
          }
        });
      },

      clearIssueSuggestionsForIssue: (issueId: string) => {
        const { issueSuggestionsByRegion } = get();
        const newSuggestions = { ...issueSuggestionsByRegion };
        
        // Remove suggestions for this issue from all regions
        Object.keys(newSuggestions).forEach(regionId => {
          const regionSuggestions = { ...newSuggestions[regionId] };
          delete regionSuggestions[issueId];
          newSuggestions[regionId] = regionSuggestions;
        });
        
        set({
          issueSuggestionsByRegion: newSuggestions
        });
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
        const { issuesByRegionMap } = get();
        return issuesByRegionMap[regionId] || EMPTY_ISSUES_ARRAY;
      },

      getIssuesForRegion: (regionId) => {
        const { issuesByRegionMap } = get();
        return issuesByRegionMap[regionId] || EMPTY_ISSUES_ARRAY;
      },

      commentById: (id) => {
        const { commentMap } = get();
        return commentMap[id] || null;
      },

      commentsByEntity: (entityId) => {
        const { commentsByEntityMap } = get();
        return commentsByEntityMap[entityId] || EMPTY_COMMENTS_ARRAY;
      },

      commentsByRegion: (regionId) => {
        const { commentsByEntityMap } = get();
        return commentsByEntityMap[regionId] || EMPTY_COMMENTS_ARRAY;
      },

      commentsByIssue: (issueId) => {
        const { commentsByEntityMap } = get();
        return commentsByEntityMap[issueId] || EMPTY_COMMENTS_ARRAY;
      },

      commentsByTranscription: () => {
        const { commentsByTranscriptionMap } = get();
        return commentsByTranscriptionMap;
      },

      getCommentsForEntity: (entityId) => {
        const { commentsByEntityMap } = get();
        return commentsByEntityMap[entityId] || EMPTY_COMMENTS_ARRAY;
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
        const baseline = regionMap[regionId] ? { ...regionMap[regionId] } : undefined;
        

        
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
        const newKnownWords = new Map(knownWords);
        
        // Handle WordAnalysis[] format ONLY
        words.forEach(word => {
          if (typeof word === 'object' && 'word' in word) {
            // WordAnalysis format - only add if analysis is COMPLETE
            // Words with empty analysis should not be in the known words cache
            if (word.analysis && word.analysis !== '' && 
                word.allAnalysis && word.allAnalysis.length > 0) {
              // Store the FULL WordAnalysis object, not just the word string
              newKnownWords.set(word.word, word);
            }
            // Skip words with empty analysis - they need to be re-analyzed
          } else {
            console.error('❌ STORE: addKnownWords received non-WordAnalysis format:', word);
          }
        });
        
        set({ knownWords: newKnownWords });
      },

      setRegionAnalysis: (regionId, analysis) => {
        const { regionMap, regions, selectedRegionId } = get();
        const existingRegion = regionMap[regionId];
        
        if (!existingRegion) {
          console.warn(`⚠️ STORE: Region ${regionId} not found, cannot set analysis`);
          return; // Region not found
        }

        console.log(`📝 STORE: Setting regionAnalysis for ${regionId}:`, {
          analysisType: Array.isArray(analysis) ? 'array' : typeof analysis,
          analysisLength: Array.isArray(analysis) ? analysis.length : 'N/A',
          firstItem: Array.isArray(analysis) && analysis.length > 0 ? analysis[0] : undefined,
          fullAnalysis: analysis
        });

        // Create updated region with new analysis
        const updatedRegion = { ...existingRegion, regionAnalysis: analysis };
        
        console.log(`📝 STORE: Updated region object:`, {
          id: updatedRegion.id,
          regionAnalysisType: typeof updatedRegion.regionAnalysis,
          regionAnalysis: updatedRegion.regionAnalysis
        });
        
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
        
        console.log(`✅ STORE: regionAnalysis set successfully for ${regionId}`);
      },

      // Transcription metadata helpers
      calculateTranscriptionMetadata: () => {
        const { regions, issues, transcription } = get();
        
        const regionCount = regions.length;
        const issueCount = issues.length;
        
        // Calculate coverage: last region end / total transcription length
        let coverage = 0;
        if (regions.length > 0 && transcription?.length) {
          // Find the latest end time among all regions
          const lastRegionEnd = Math.max(...regions.map(r => r.end));
          coverage = Math.min(lastRegionEnd / transcription.length, 1.0); // Cap at 1.0
        }

        return { regionCount, issueCount, coverage };
      },
    }),
    { name: 'EditorStore' }
  )
); 
