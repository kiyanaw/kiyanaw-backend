import { storeService } from './storeService';
import { useEditorStore } from '../stores/useEditorStore';
import type { RegionData } from './adt';

// Mock the store
jest.mock('../stores/useEditorStore');

const mockStore = {
  setRegionAnalysis: jest.fn(),
  addKnownWords: jest.fn(),
  knownWords: new Set(['test', 'word']),
  setRegionText: jest.fn(),
  setRegionTranslation: jest.fn(),
  updateRegionBounds: jest.fn(),
  addNewRegion: jest.fn(),
  deleteRegion: jest.fn(),
  regionById: jest.fn(),
  regionMap: {},
  canEdit: true,
};

const mockUseEditorStore = useEditorStore as jest.MockedFunction<typeof useEditorStore>;

describe('storeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock getState to return our mock store
    mockUseEditorStore.getState = jest.fn(() => mockStore as any);
  });

  describe('region analysis operations', () => {
    it('should call setRegionAnalysis with fresh state', () => {
      const regionId = 'test-region';
      const analysis = ['word1', 'word2'];

      storeService.setRegionAnalysis(regionId, analysis);

      expect(mockUseEditorStore.getState).toHaveBeenCalled();
      expect(mockStore.setRegionAnalysis).toHaveBeenCalledWith(regionId, analysis);
    });

    it('should call addKnownWords with fresh state', () => {
      const words = ['new', 'words'];

      storeService.addKnownWords(words);

      expect(mockUseEditorStore.getState).toHaveBeenCalled();
      expect(mockStore.addKnownWords).toHaveBeenCalledWith(words);
    });

    it('should return knownWords from fresh state', () => {
      const result = storeService.getKnownWords();

      expect(mockUseEditorStore.getState).toHaveBeenCalled();
      expect(result).toEqual(new Set(['test', 'word']));
    });
  });

  describe('region operations', () => {
    it('should call setRegionText with fresh state', () => {
      const regionId = 'test-region';
      const text = 'new text';

      storeService.setRegionText(regionId, text);

      expect(mockUseEditorStore.getState).toHaveBeenCalled();
      expect(mockStore.setRegionText).toHaveBeenCalledWith(regionId, text);
    });

    it('should call setRegionTranslation with fresh state', () => {
      const regionId = 'test-region';
      const translation = 'new translation';

      storeService.setRegionTranslation(regionId, translation);

      expect(mockUseEditorStore.getState).toHaveBeenCalled();
      expect(mockStore.setRegionTranslation).toHaveBeenCalledWith(regionId, translation);
    });

    it('should call updateRegionBounds with fresh state', () => {
      const regionId = 'test-region';
      const start = 10;
      const end = 20;

      storeService.updateRegionBounds(regionId, start, end);

      expect(mockUseEditorStore.getState).toHaveBeenCalled();
      expect(mockStore.updateRegionBounds).toHaveBeenCalledWith(regionId, start, end);
    });

    it('should call addNewRegion with fresh state', () => {
      const region = { id: 'new-region' } as RegionData;

      storeService.addNewRegion(region);

      expect(mockUseEditorStore.getState).toHaveBeenCalled();
      expect(mockStore.addNewRegion).toHaveBeenCalledWith(region);
    });

    it('should call deleteRegion with fresh state', () => {
      const regionId = 'test-region';

      storeService.deleteRegion(regionId);

      expect(mockUseEditorStore.getState).toHaveBeenCalled();
      expect(mockStore.deleteRegion).toHaveBeenCalledWith(regionId);
    });
  });

  describe('read operations', () => {
      it('should call regionById with fresh state', () => {
    const regionId = 'test-region';
    const mockRegion = { id: regionId } as RegionData;
    // Set up regionMap with the test region
    mockStore.regionMap = { [regionId]: mockRegion };

    const result = storeService.regionById(regionId);

    expect(mockUseEditorStore.getState).toHaveBeenCalled();
    expect(result).toBe(mockRegion);
  });

    it('should call canEdit with fresh state', () => {
      const result = storeService.canEdit();

      expect(mockUseEditorStore.getState).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('fresh state behavior', () => {
    it('should get fresh state for each method call', () => {
      // Set up a test region in regionMap
      mockStore.regionMap = { 'test': { id: 'test' } as RegionData };
      
      // Call multiple methods
      storeService.canEdit();
      storeService.getKnownWords();
      storeService.regionById('test');

      // Should call getState for each operation
      expect(mockUseEditorStore.getState).toHaveBeenCalledTimes(3);
    });

    it('should not cache state between calls', () => {
      // Clear previous call counts
      jest.clearAllMocks();
      
      // First call
      mockUseEditorStore.getState = jest.fn(() => ({ ...mockStore, canEdit: true } as any));
      const firstResult = storeService.canEdit();
      expect(firstResult).toBe(true);
      
      // Modify mock store to return different canEdit value
      mockUseEditorStore.getState = jest.fn(() => ({ ...mockStore, canEdit: false } as any));
      
      // Second call should get fresh state
      const secondResult = storeService.canEdit();
      
      expect(secondResult).toBe(false);
      // Each call should get fresh state (can't easily test call count with reassignment)
    });
  });
}); 