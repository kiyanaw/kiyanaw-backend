import { useEditorStore } from './useEditorStore';

describe('useEditorStore selectedRegion updates', () => {
  beforeEach(() => {
    // Reset store state before each test
    useEditorStore.setState({
      regions: [],
      regionMap: {},
      selectedRegionId: null,
      selectedRegion: null,
    });
  });

  it('should update selectedRegion when updating bounds of selected region', () => {
    const store = useEditorStore.getState();
    
    // Setup: Add a region to the store
    const testRegion = {
      id: 'region-1',
      start: 10.0,
      end: 20.0,
      regionText: 'Test region',
      translation: 'Test translation'
    };
    
    store.addNewRegion(testRegion);
    
    // Select the region
    store.setSelectedRegion('region-1');
    
    // Verify initial state
    let currentState = useEditorStore.getState();
    expect(currentState.selectedRegion).toEqual(testRegion);
    expect(currentState.selectedRegion.start).toBe(10.0);
    expect(currentState.selectedRegion.end).toBe(20.0);
    
    // Update the region bounds
    store.updateRegionBounds('region-1', 15.0, 25.0);
    
    // Verify selectedRegion was updated too
    currentState = useEditorStore.getState();
    expect(currentState.selectedRegion.start).toBe(15.0);
    expect(currentState.selectedRegion.end).toBe(25.0);
    expect(currentState.selectedRegion.id).toBe('region-1');
    
    // Verify regionMap was also updated
    expect(currentState.regionMap['region-1'].start).toBe(15.0);
    expect(currentState.regionMap['region-1'].end).toBe(25.0);
  });

  it('should not update selectedRegion when updating bounds of different region', () => {
    const store = useEditorStore.getState();
    
    // Setup: Add two regions
    const region1 = { id: 'region-1', start: 10.0, end: 20.0, regionText: 'Region 1', translation: 'Translation 1' };
    const region2 = { id: 'region-2', start: 30.0, end: 40.0, regionText: 'Region 2', translation: 'Translation 2' };
    
    store.addNewRegion(region1);
    store.addNewRegion(region2);
    
    // Select region-1
    store.setSelectedRegion('region-1');
    
    // Verify initial state
    let currentState = useEditorStore.getState();
    expect(currentState.selectedRegion.id).toBe('region-1');
    expect(currentState.selectedRegion.start).toBe(10.0);
    
    // Update region-2 bounds (not the selected one)
    store.updateRegionBounds('region-2', 35.0, 45.0);
    
    // Verify selectedRegion was NOT updated (still region-1 with original bounds)
    currentState = useEditorStore.getState();
    expect(currentState.selectedRegion.id).toBe('region-1');
    expect(currentState.selectedRegion.start).toBe(10.0);
    expect(currentState.selectedRegion.end).toBe(20.0);
    
    // But verify region-2 was updated in regionMap
    expect(currentState.regionMap['region-2'].start).toBe(35.0);
    expect(currentState.regionMap['region-2'].end).toBe(45.0);
  });

  it('should update selectedRegion when updating text of selected region', () => {
    const store = useEditorStore.getState();
    
    // Setup
    const testRegion = { id: 'region-1', start: 10.0, end: 20.0, regionText: 'Original text', translation: 'Original translation' };
    store.addNewRegion(testRegion);
    store.setSelectedRegion('region-1');
    
    // Update text
    store.setRegionText('region-1', 'Updated text');
    
    // Verify selectedRegion was updated
    const currentState = useEditorStore.getState();
    expect(currentState.selectedRegion.regionText).toBe('Updated text');
  });

  it('should update selectedRegion when updating translation of selected region', () => {
    const store = useEditorStore.getState();
    
    // Setup
    const testRegion = { id: 'region-1', start: 10.0, end: 20.0, regionText: 'Test text', translation: 'Original translation' };
    store.addNewRegion(testRegion);
    store.setSelectedRegion('region-1');
    
    // Update translation
    store.setRegionTranslation('region-1', 'Updated translation');
    
    // Verify selectedRegion was updated
    const currentState = useEditorStore.getState();
    expect(currentState.selectedRegion.translation).toBe('Updated translation');
  });
}); 