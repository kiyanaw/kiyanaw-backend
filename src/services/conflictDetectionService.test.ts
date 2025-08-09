import { ConflictDetectionService, type ConflictResult, type ConflictType } from './conflictDetectionService';
import type { RegionData } from './adt';

describe('ConflictDetectionService', () => {
  let service: ConflictDetectionService;

  beforeEach(() => {
    service = new ConflictDetectionService();
  });

  // Helper function to create test region data
  const createTestRegion = (overrides: Partial<RegionData> = {}): RegionData => ({
    id: 'test-region-1',
    start: 10.0,
    end: 20.0,
    regionText: 'Hello world',
    translation: 'Bonjour monde',
    transcriptionId: 'test-transcription',
    dateLastUpdated: '2023-01-01T10:00:00Z',
    updatedAt: '2023-01-01T10:00:00Z',
    _version: 1,
    ...overrides
  });

  describe('detectConflict', () => {
    it('should throw error when comparing different regions', () => {
      const local = createTestRegion({ id: 'region-1' });
      const remote = createTestRegion({ id: 'region-2' });

      expect(() => service.detectConflict(local, remote)).toThrow(
        'Cannot detect conflicts between different regions'
      );
    });

    it('should return no conflict when regions are identical', () => {
      const local = createTestRegion();
      const remote = createTestRegion();

      const result = service.detectConflict(local, remote);

      expect(result.hasConflict).toBe(false);
      expect(result.conflictType).toBe('none');
      expect(result.autoMergeResult).toEqual(remote);
      expect(result.conflictDetails).toBeUndefined();
    });

    it('should detect resolvable conflict for text vs bounds changes', () => {
      const local = createTestRegion({
        regionText: 'Updated text locally',
        dateLastUpdated: '2023-01-01T11:00:00Z'
      });
      const remote = createTestRegion({
        start: 15.0,
        end: 25.0,
        dateLastUpdated: '2023-01-01T10:30:00Z'
      });

      const result = service.detectConflict(local, remote);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('resolvable');
      expect(result.autoMergeResult).toBeDefined();
      expect(result.conflictDetails).toHaveLength(3); // regionText, start, end
      
      // Check that auto-merge uses newer timestamp for text (local is newer)
      expect(result.autoMergeResult?.regionText).toBe('Updated text locally');
      // And remote values for bounds (since local didn't change bounds)
      expect(result.autoMergeResult?.start).toBe(15.0);
      expect(result.autoMergeResult?.end).toBe(25.0);
    });

    it('should detect text conflict when both sides change text', () => {
      const local = createTestRegion({
        regionText: 'Local text change',
        dateLastUpdated: '2023-01-01T11:00:00Z'
      });
      const remote = createTestRegion({
        regionText: 'Remote text change',
        dateLastUpdated: '2023-01-01T10:30:00Z'
      });

      const result = service.detectConflict(local, remote);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('text');
      expect(result.autoMergeResult).toBeUndefined();
      expect(result.conflictDetails).toHaveLength(1);
      expect(result.conflictDetails?.[0].field).toBe('regionText');
      expect(result.conflictDetails?.[0].canAutoMerge).toBe(false);
    });

    it('should detect complex conflict when both sides change bounds', () => {
      const local = createTestRegion({
        start: 12.0,
        end: 22.0,
        dateLastUpdated: '2023-01-01T11:00:00Z'
      });
      const remote = createTestRegion({
        start: 15.0,
        end: 25.0,
        dateLastUpdated: '2023-01-01T10:30:00Z'
      });

      const result = service.detectConflict(local, remote);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('complex');
      expect(result.autoMergeResult).toBeUndefined();
      expect(result.conflictDetails).toHaveLength(2); // start, end
      expect(result.conflictDetails?.every(d => !d.canAutoMerge)).toBe(true);
    });

    it('should handle translation conflicts similar to text conflicts', () => {
      const local = createTestRegion({
        translation: 'Local translation',
        dateLastUpdated: '2023-01-01T11:00:00Z'
      });
      const remote = createTestRegion({
        translation: 'Remote translation',
        dateLastUpdated: '2023-01-01T10:30:00Z'
      });

      const result = service.detectConflict(local, remote);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('text');
      expect(result.conflictDetails?.[0].field).toBe('translation');
      expect(result.conflictDetails?.[0].canAutoMerge).toBe(false);
    });

    it('should generate unique conflict IDs', () => {
      const local = createTestRegion({ regionText: 'local' });
      const remote = createTestRegion({ regionText: 'remote' });

      const result1 = service.detectConflict(local, remote);
      const result2 = service.detectConflict(local, remote);

      expect(result1.conflictDetails?.[0].conflictId).toBeDefined();
      expect(result2.conflictDetails?.[0].conflictId).toBeDefined();
      expect(result1.conflictDetails?.[0].conflictId).not.toBe(result2.conflictDetails?.[0].conflictId);
    });
  });

  describe('canAutoMerge', () => {
    it('should return true for no conflicts', () => {
      const local = createTestRegion();
      const remote = createTestRegion();

      expect(service.canAutoMerge(local, remote)).toBe(true);
    });

    it('should return true for resolvable conflicts', () => {
      const local = createTestRegion({ regionText: 'new text' });
      const remote = createTestRegion({ start: 15.0 });

      expect(service.canAutoMerge(local, remote)).toBe(true);
    });

    it('should return false for text conflicts', () => {
      const local = createTestRegion({ regionText: 'local text' });
      const remote = createTestRegion({ regionText: 'remote text' });

      expect(service.canAutoMerge(local, remote)).toBe(false);
    });

    it('should return false for complex conflicts', () => {
      const local = createTestRegion({ start: 12.0, end: 22.0 });
      const remote = createTestRegion({ start: 15.0, end: 25.0 });

      expect(service.canAutoMerge(local, remote)).toBe(false);
    });
  });

  describe('createMergedRegion', () => {
    it('should merge orthogonal changes correctly', () => {
      const local = createTestRegion({
        regionText: 'Local text update',
        dateLastUpdated: '2023-01-01T12:00:00Z' // Newer
      });
      const remote = createTestRegion({
        start: 15.0,
        end: 25.0,
        _version: 2,
        dateLastUpdated: '2023-01-01T11:00:00Z' // Older
      });

      const merged = service.createMergedRegion(local, remote);

      // Should use remote as base (has newer version)
      expect(merged._version).toBe(2);
      expect(merged.start).toBe(15.0);
      expect(merged.end).toBe(25.0);
      
      // Should use local text (newer timestamp)
      expect(merged.regionText).toBe('Local text update');
    });

    it('should preserve remote metadata when auto-merging', () => {
      const local = createTestRegion({
        regionText: 'Updated locally',
        dateLastUpdated: '2023-01-01T12:00:00Z'
      });
      const remote = createTestRegion({
        start: 15.0,
        _version: 3,
        userLastUpdated: 'remote-user',
        dateLastUpdated: '2023-01-01T11:00:00Z'
      });

      const merged = service.createMergedRegion(local, remote);

      expect(merged._version).toBe(3);
      expect(merged.userLastUpdated).toBe('remote-user');
      expect(merged.regionText).toBe('Updated locally'); // Local is newer
      expect(merged.start).toBe(15.0); // Remote bounds change
    });

    it('should use timestamp to resolve auto-mergeable conflicts', () => {
      const local = createTestRegion({
        regionText: 'Local text',
        dateLastUpdated: '2023-01-01T10:00:00Z' // Older
      });
      const remote = createTestRegion({
        start: 15.0,
        regionText: 'Remote text', // This should win due to newer timestamp
        dateLastUpdated: '2023-01-01T11:00:00Z' // Newer
      });

      const merged = service.createMergedRegion(local, remote);

      expect(merged.regionText).toBe('Remote text');
      expect(merged.start).toBe(15.0);
    });
  });

  describe('edge cases', () => {
    it('should handle missing timestamps gracefully', () => {
      const local = createTestRegion({
        regionText: 'local',
        dateLastUpdated: undefined,
        updatedAt: undefined
      });
      const remote = createTestRegion({
        start: 15.0,
        dateLastUpdated: '2023-01-01T11:00:00Z'
      });

      const result = service.detectConflict(local, remote);
      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('resolvable');

      const merged = service.createMergedRegion(local, remote);
      expect(merged).toBeDefined();
    });

    it('should handle null/undefined field values', () => {
      const local = createTestRegion({
        regionText: undefined,
        translation: null as any
      });
      const remote = createTestRegion({
        regionText: 'some text',
        translation: 'some translation'
      });

      const result = service.detectConflict(local, remote);
      expect(result.hasConflict).toBe(true);
      expect(result.conflictDetails).toHaveLength(2);
    });

    it('should handle complex multi-field conflicts', () => {
      const local = createTestRegion({
        regionText: 'local text',
        translation: 'local translation',
        start: 12.0
      });
      const remote = createTestRegion({
        regionText: 'remote text',
        translation: 'remote translation',
        end: 25.0
      });

      const result = service.detectConflict(local, remote);
      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('text'); // Text conflicts take precedence
      expect(result.conflictDetails).toHaveLength(4); // regionText, translation, start, end
    });

    it('REGRESSION: should NOT detect conflicts for null vs empty string differences', () => {
      // Test case 1: Local has empty string, remote has null
      const local1 = createTestRegion({
        regionText: 'User typed text',
        translation: ''  // Empty string
      });
      const remote1 = createTestRegion({
        regionText: 'User typed text',
        translation: null as any  // null
      });

      const result1 = service.detectConflict(local1, remote1);
      expect(result1.hasConflict).toBe(false);
      expect(result1.conflictType).toBe('none');

      // Test case 2: Local has null, remote has empty string
      const local2 = createTestRegion({
        regionText: null as any,  // null
        translation: 'User typed translation'
      });
      const remote2 = createTestRegion({
        regionText: '',  // Empty string
        translation: 'User typed translation'
      });

      const result2 = service.detectConflict(local2, remote2);
      expect(result2.hasConflict).toBe(false);
      expect(result2.conflictType).toBe('none');

      // Test case 3: Both fields have null vs empty string differences
      const local3 = createTestRegion({
        regionText: '',    // Empty string
        translation: null as any  // null
      });
      const remote3 = createTestRegion({
        regionText: null as any,  // null
        translation: ''    // Empty string
      });

      const result3 = service.detectConflict(local3, remote3);
      expect(result3.hasConflict).toBe(false);
      expect(result3.conflictType).toBe('none');
    });

    it('REGRESSION: should still detect real text conflicts after null/empty normalization', () => {
      // Ensure we don't break real conflict detection
      const local = createTestRegion({
        regionText: 'Local text change',
        translation: ''  // Empty string
      });
      const remote = createTestRegion({
        regionText: 'Remote text change',
        translation: null as any  // null (should not conflict)
      });

      const result = service.detectConflict(local, remote);
      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('text');
      expect(result.conflictDetails).toHaveLength(1); // Only regionText should conflict
      expect(result.conflictDetails![0].field).toBe('regionText');
    });
  });
}); 