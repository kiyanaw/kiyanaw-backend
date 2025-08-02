import { useEditorStore } from './useEditorStore';
import type { RegionData } from '../types/shared';

// Helper function to create test region data with all required properties
const createTestRegion = (overrides: Partial<RegionData> = {}): RegionData => ({
  id: 'region-1',
  transcriptionId: 'transcription-1',
  start: 10.0,
  end: 20.0,
  regionText: 'Test region',
  translation: 'Test translation',
  dateLastUpdated: '1234567890',
  userLastUpdated: 'testuser',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  _version: 1, // Always provide version for test regions
  ...overrides,
});

describe('useEditorStore selectedRegion updates', () => {
  beforeEach(() => {
    // Reset store state before each test
    useEditorStore.getState().cleanup(); // Full cleanup first
    useEditorStore.setState({
      regions: [],
      regionMap: {},
      regionVersions: {},
      pendingEdits: {},
      selectedRegionId: null,
      selectedRegion: null,
    });
  });

  it('should update selectedRegion when updating bounds of selected region', () => {
    const store = useEditorStore.getState();
    
    // Setup: Add a region to the store
    const testRegion = createTestRegion();
    
    store.addNewRegion(testRegion);
    
    // Select the region
    store.setSelectedRegion('region-1');
    
    // Verify initial state
    let currentState = useEditorStore.getState();
    expect(currentState.selectedRegion).toEqual(testRegion);
    expect(currentState.selectedRegion!.start).toBe(10.0);
    expect(currentState.selectedRegion!.end).toBe(20.0);
    
    // Update the region bounds
    store.updateRegionBounds('region-1', 15.0, 25.0);
    
    // Verify selectedRegion was updated too
    currentState = useEditorStore.getState();
    expect(currentState.selectedRegion!.start).toBe(15.0);
    expect(currentState.selectedRegion!.end).toBe(25.0);
    expect(currentState.selectedRegion!.id).toBe('region-1');
    
    // Verify regionMap was also updated
    expect(currentState.regionMap['region-1'].start).toBe(15.0);
    expect(currentState.regionMap['region-1'].end).toBe(25.0);
  });

  it('should not update selectedRegion when updating bounds of different region', () => {
    const store = useEditorStore.getState();
    
    // Setup: Add two regions
    const region1 = createTestRegion({ id: 'region-1', regionText: 'Region 1', translation: 'Translation 1' });
    const region2 = createTestRegion({ id: 'region-2', start: 30.0, end: 40.0, regionText: 'Region 2', translation: 'Translation 2' });
    
    store.addNewRegion(region1);
    store.addNewRegion(region2);
    
    // Select region-1
    store.setSelectedRegion('region-1');
    
        // Verify initial state
    let currentState = useEditorStore.getState();
    expect(currentState.selectedRegion!.id).toBe('region-1');
    expect(currentState.selectedRegion!.start).toBe(10.0);

    // Update region-2 bounds (not the selected one)
    store.updateRegionBounds('region-2', 35.0, 45.0);
    
    // Verify selectedRegion was NOT updated (still region-1 with original bounds)
    currentState = useEditorStore.getState();
    expect(currentState.selectedRegion!.id).toBe('region-1');
    expect(currentState.selectedRegion!.start).toBe(10.0);
    expect(currentState.selectedRegion!.end).toBe(20.0);
    
    // But verify region-2 was updated in regionMap
    expect(currentState.regionMap['region-2'].start).toBe(35.0);
    expect(currentState.regionMap['region-2'].end).toBe(45.0);
  });

  it('should update selectedRegion when updating text of selected region', () => {
    const store = useEditorStore.getState();
    
    // Setup
    const testRegion = createTestRegion({ regionText: 'Original text', translation: 'Original translation' });
    store.addNewRegion(testRegion);
    store.setSelectedRegion('region-1');
    
    // Update text
    store.setRegionText('region-1', 'Updated text');
    
    // Verify selectedRegion was updated
    const currentState = useEditorStore.getState();
    expect(currentState.selectedRegion!.regionText).toBe('Updated text');
  });

  it('should update selectedRegion when updating translation of selected region', () => {
    const store = useEditorStore.getState();
    
    // Setup
    const testRegion = createTestRegion({ regionText: 'Test text', translation: 'Original translation' });
    store.addNewRegion(testRegion);
    store.setSelectedRegion('region-1');
    
    // Update translation
    store.setRegionTranslation('region-1', 'Updated translation');
    
    // Verify selectedRegion was updated
    const currentState = useEditorStore.getState();
    expect(currentState.selectedRegion!.translation).toBe('Updated translation');
  });
});

describe('useEditorStore known words functionality', () => {
  beforeEach(() => {
    // Reset store state before each test
    useEditorStore.setState({
      regions: [],
      regionMap: {},
      selectedRegionId: null,
      selectedRegion: null,
      knownWords: new Set()
    });
  });

  describe('addKnownWords', () => {
    it('should add new known words to the set', () => {
      const store = useEditorStore.getState();
      
      store.addKnownWords(['hello', 'world', 'êkwa']);
      
      const state = useEditorStore.getState();
      expect(state.knownWords.has('hello')).toBe(true);
      expect(state.knownWords.has('world')).toBe(true);
      expect(state.knownWords.has('êkwa')).toBe(true);
      expect(state.knownWords.size).toBe(3);
    });

    it('should not add duplicates', () => {
      const store = useEditorStore.getState();
      
      store.addKnownWords(['hello', 'world']);
      store.addKnownWords(['hello', 'êkwa']); // hello is duplicate
      
      const state = useEditorStore.getState();
      expect(state.knownWords.size).toBe(3); // hello, world, êkwa
      expect(state.knownWords.has('hello')).toBe(true);
      expect(state.knownWords.has('world')).toBe(true);
      expect(state.knownWords.has('êkwa')).toBe(true);
    });

    it('should handle empty array', () => {
      const store = useEditorStore.getState();
      
      store.addKnownWords([]);
      
      const state = useEditorStore.getState();
      expect(state.knownWords.size).toBe(0);
    });

    it('should handle Unicode characters', () => {
      const store = useEditorStore.getState();
      
      store.addKnownWords(['itwêw', 'êkwa', 'tâpwê', 'ohci']);
      
      const state = useEditorStore.getState();
      expect(state.knownWords.has('itwêw')).toBe(true);
      expect(state.knownWords.has('êkwa')).toBe(true);
      expect(state.knownWords.has('tâpwê')).toBe(true);
      expect(state.knownWords.has('ohci')).toBe(true);
      expect(state.knownWords.size).toBe(4);
    });
  });

  describe('setRegionAnalysis', () => {
    it('should set region analysis for existing region', () => {
      const store = useEditorStore.getState();
      
      // Add a region first
      const testRegion = createTestRegion({
        regionText: 'hello world êkwa',
        translation: 'test translation'
      });
      store.addNewRegion(testRegion);
      
      // Set analysis
      store.setRegionAnalysis('region-1', ['hello', 'êkwa']);
      
      const state = useEditorStore.getState();
      const region = state.regionMap['region-1'];
      expect(region.regionAnalysis).toEqual(['hello', 'êkwa']);
    });

    it('should update selectedRegion if it matches', () => {
      const store = useEditorStore.getState();
      
      // Add and select region
      const testRegion = createTestRegion({
        regionText: 'hello world êkwa',
        translation: 'test translation'
      });
      store.addNewRegion(testRegion);
      store.setSelectedRegion('region-1');
      
      // Set analysis
      store.setRegionAnalysis('region-1', ['hello', 'êkwa']);
      
      const state = useEditorStore.getState();
      expect(state.selectedRegion?.regionAnalysis).toEqual(['hello', 'êkwa']);
    });

    it('should handle non-existent region gracefully', () => {
      const store = useEditorStore.getState();
      
      // This should not throw
      store.setRegionAnalysis('non-existent', ['hello']);
      
      const state = useEditorStore.getState();
      expect(state.regionMap['non-existent']).toBeUndefined();
    });

    it('should handle empty analysis array', () => {
      const store = useEditorStore.getState();
      
      const testRegion = createTestRegion({
        regionText: 'unknown words',
        translation: 'test translation'
      });
      store.addNewRegion(testRegion);
      
      store.setRegionAnalysis('region-1', []);
      
      const state = useEditorStore.getState();
      expect(state.regionMap['region-1'].regionAnalysis).toEqual([]);
    });
  });

  describe('version tracking', () => {
    it('should track versions when adding new regions', () => {
      const store = useEditorStore.getState();
      
      const testRegion = createTestRegion({ _version: 3 });
      store.addNewRegion(testRegion);
      
      const state = useEditorStore.getState();
      expect(state.regionVersions['region-1']).toBe(3);
    });

    it('should default to version 1 when adding regions without version', () => {
      const store = useEditorStore.getState();
      
      const testRegion = createTestRegion();
      store.addNewRegion(testRegion);
      
      const state = useEditorStore.getState();
      expect(state.regionVersions['region-1']).toBe(1);
    });

    it('should remove version tracking when deleting regions', () => {
      const store = useEditorStore.getState();
      
      const testRegion = createTestRegion({ _version: 5 });
      store.addNewRegion(testRegion);
      
      // Verify version is tracked
      let state = useEditorStore.getState();
      expect(state.regionVersions['region-1']).toBe(5);
      
      // Delete the region
      store.deleteRegion('region-1');
      
      // Verify version tracking is removed
      state = useEditorStore.getState();
      expect(state.regionVersions['region-1']).toBeUndefined();
    });

    it('should provide getRegionVersion getter', () => {
      const store = useEditorStore.getState();
      
      const testRegion = createTestRegion({ _version: 7 });
      store.addNewRegion(testRegion);
      
      expect(store.getRegionVersion('region-1')).toBe(7);
      
      // Should throw for nonexistent regions instead of defaulting
      expect(() => store.getRegionVersion('nonexistent')).toThrow('No version tracked for region nonexistent');
    });

    it('should populate regionVersions in setFullTranscriptionData', () => {
      const store = useEditorStore.getState();
      
      const testData = {
        transcription: {
          id: 'transcription-1',
          title: 'Test Transcription',
          author: 'test-author',
          authorFriendly: 'Test Author',
          type: 'audio',
          source: 'test-source',
          length: 120
        },
        regions: [
          createTestRegion({ id: 'region-1', _version: 2 }),
          createTestRegion({ id: 'region-2', _version: 3 }),
          createTestRegion({ id: 'region-3', _version: 4 }) // All regions must have versions
        ],
        issues: [],
        peaks: []
      };

      store.setFullTranscriptionData(testData);
      
      const state = useEditorStore.getState();
      expect(state.regionVersions['region-1']).toBe(2);
      expect(state.regionVersions['region-2']).toBe(3);
      expect(state.regionVersions['region-3']).toBe(4);
    });

    it('should reset regionVersions on cleanup', () => {
      const store = useEditorStore.getState();
      
      const testRegion = createTestRegion({ _version: 4 });
      store.addNewRegion(testRegion);
      
      // Verify version is tracked
      let state = useEditorStore.getState();
      expect(state.regionVersions['region-1']).toBe(4);
      
      // Cleanup
      store.cleanup();
      
      // Verify version tracking is reset
      state = useEditorStore.getState();
      expect(state.regionVersions).toEqual({});
    });
  });

  describe('pending edits tracking', () => {
    it('should start tracking pending edits', () => {
      const store = useEditorStore.getState();
      
      store.startPendingEdit('region-1', 'regionText');
      
      const state = useEditorStore.getState();
      expect(state.pendingEdits['region-1:regionText']).toEqual({
        regionId: 'region-1',
        field: 'regionText',
        startedAt: expect.any(Date),
        lastActivity: expect.any(Date),
      });
    });

    it('should end tracking pending edits', () => {
      const store = useEditorStore.getState();
      
      store.startPendingEdit('region-1', 'regionText');
      let state = useEditorStore.getState();
      expect(state.pendingEdits['region-1:regionText']).toBeDefined();
      
      store.endPendingEdit('region-1', 'regionText');
      state = useEditorStore.getState();
      expect(state.pendingEdits['region-1:regionText']).toBeUndefined();
    });

    it('should update activity for pending edits', () => {
      const store = useEditorStore.getState();
      
      store.startPendingEdit('region-1', 'regionText');
      const initialState = useEditorStore.getState();
      const initialActivity = initialState.pendingEdits['region-1:regionText'].lastActivity;
      
      // Wait a bit and update activity
      setTimeout(() => {
        store.updatePendingEditActivity('region-1', 'regionText');
        const updatedState = useEditorStore.getState();
        const updatedActivity = updatedState.pendingEdits['region-1:regionText'].lastActivity;
        
        expect(updatedActivity.getTime()).toBeGreaterThan(initialActivity.getTime());
      }, 10);
    });

    it('should check if region/field is being edited', () => {
      const store = useEditorStore.getState();
      
      store.startPendingEdit('region-1', 'regionText');
      store.startPendingEdit('region-2', 'translation');
      
      // Specific field checks
      expect(store.isPendingEdit('region-1', 'regionText')).toBe(true);
      expect(store.isPendingEdit('region-2', 'translation')).toBe(true);
      expect(store.isPendingEdit('region-1', 'translation')).toBe(false);
      expect(store.isPendingEdit('region-3', 'regionText')).toBe(false);
      
      // Any field checks
      expect(store.isPendingEdit('region-1')).toBe(true);
      expect(store.isPendingEdit('region-2')).toBe(true);
      expect(store.isPendingEdit('region-3')).toBe(false);
    });

    it('should handle multiple pending edits for same region', () => {
      const store = useEditorStore.getState();
      
      store.startPendingEdit('region-1', 'regionText');
      store.startPendingEdit('region-1', 'translation');
      
      const state = useEditorStore.getState();
      expect(state.pendingEdits['region-1:regionText']).toBeDefined();
      expect(state.pendingEdits['region-1:translation']).toBeDefined();
      
      expect(store.isPendingEdit('region-1', 'regionText')).toBe(true);
      expect(store.isPendingEdit('region-1', 'translation')).toBe(true);
      expect(store.isPendingEdit('region-1')).toBe(true);
    });

    it('should handle updating activity for non-existent edit gracefully', () => {
      const store = useEditorStore.getState();
      
      // Ensure we start clean
      useEditorStore.setState({ pendingEdits: {} });
      
      expect(() => store.updatePendingEditActivity('region-1', 'regionText')).not.toThrow();
      
      const state = useEditorStore.getState();
      expect(state.pendingEdits['region-1:regionText']).toBeUndefined();
    });

    it('should reset pending edits on cleanup', () => {
      const store = useEditorStore.getState();
      
      // Ensure we start clean
      useEditorStore.setState({ pendingEdits: {} });
      
      store.startPendingEdit('region-1', 'regionText');
      store.startPendingEdit('region-2', 'translation');
      
      let state = useEditorStore.getState();
      expect(Object.keys(state.pendingEdits)).toHaveLength(2);
      
      store.cleanup();
      
      state = useEditorStore.getState();
      expect(state.pendingEdits).toEqual({});
    });
  });

  describe('strict version validation', () => {
    it('should throw when trying to add region without _version', () => {
      const store = useEditorStore.getState();
      
      const regionWithoutVersion = createTestRegion({ _version: undefined });
      
      expect(() => store.addNewRegion(regionWithoutVersion)).toThrow(
        'Cannot add region region-1 without _version field'
      );
    });

    it('should throw when loading transcription data with regions missing _version', () => {
      const store = useEditorStore.getState();
      
      const dataWithMissingVersion = {
        transcription: {
          id: 'transcription-1',
          title: 'Test Transcription',
          author: 'test-author',
          authorFriendly: 'Test Author',
          type: 'audio',
          source: 'test-source',
          length: 120
        },
        regions: [
          createTestRegion({ id: 'region-1', _version: 2 }),
          createTestRegion({ id: 'region-2', _version: undefined }) // Missing version
        ],
        issues: [],
        peaks: []
      };

      expect(() => store.setFullTranscriptionData(dataWithMissingVersion)).toThrow(
        'Region region-2 from database is missing _version field'
      );
    });

    it('should throw when getting version for non-tracked region', () => {
      const store = useEditorStore.getState();
      
      expect(() => store.getRegionVersion('nonexistent-region')).toThrow(
        'No version tracked for region nonexistent-region - this indicates a data integrity issue'
      );
    });
  });
}); 