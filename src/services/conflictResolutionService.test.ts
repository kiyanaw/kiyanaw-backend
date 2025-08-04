import { conflictResolutionService, ConflictData } from './conflictResolutionService';

describe('ConflictResolutionService', () => {
  beforeEach(() => {
    // Clear any existing active conflicts
    conflictResolutionService.dismissConflict('test-region', 'regionText');
    conflictResolutionService.dismissConflict('test-region', 'translation');
  });

  describe('showConflictDialog', () => {
    it('should handle basic conflict resolution', async () => {
      const conflictData: ConflictData = {
        regionId: 'test-region-1',
        field: 'regionText',
        localValue: 'User typed this',
        remoteValue: 'Remote saved this',
        localVersion: 5,
        remoteVersion: 6,
        timestamp: Date.now(),
        conflictId: 'conflict-123'
      };

      const result = await conflictResolutionService.showConflictDialog(conflictData);

      expect(result).toEqual({
        action: 'accept_remote'
      });
    });

    it('should track active conflicts correctly', async () => {
      const conflictData: ConflictData = {
        regionId: 'test-region-1',
        field: 'regionText',
        localValue: 'User text',
        remoteValue: 'Remote text',
        localVersion: 5,
        remoteVersion: 6,
        timestamp: Date.now(),
        conflictId: 'conflict-456'
      };

      // Should not have active conflict initially
      expect(conflictResolutionService.hasActiveConflict('test-region-1', 'regionText')).toBe(false);

      // Start conflict resolution (don't await to test intermediate state)
      const resolutionPromise = conflictResolutionService.showConflictDialog(conflictData);

      // Should complete quickly in test environment
      const result = await resolutionPromise;

      // Should have resolved
      expect(result.action).toBe('accept_remote');
      expect(conflictResolutionService.hasActiveConflict('test-region-1', 'regionText')).toBe(false);
    });
  });

  describe('hasActiveConflict', () => {
    it('should return false for non-existent conflicts', () => {
      expect(conflictResolutionService.hasActiveConflict('non-existent', 'regionText')).toBe(false);
    });

    it('should differentiate between different region/field combinations', () => {
      expect(conflictResolutionService.hasActiveConflict('region-1', 'regionText')).toBe(false);
      expect(conflictResolutionService.hasActiveConflict('region-1', 'translation')).toBe(false);
      expect(conflictResolutionService.hasActiveConflict('region-2', 'regionText')).toBe(false);
    });
  });

  describe('dismissConflict', () => {
    it('should safely dismiss non-existent conflicts', () => {
      expect(() => {
        conflictResolutionService.dismissConflict('non-existent', 'regionText');
      }).not.toThrow();
    });

    it('should be idempotent', () => {
      conflictResolutionService.dismissConflict('test-region', 'regionText');
      conflictResolutionService.dismissConflict('test-region', 'regionText');
      
      expect(conflictResolutionService.hasActiveConflict('test-region', 'regionText')).toBe(false);
    });
  });

  describe('conflict data structure', () => {
    it('should handle different field types', async () => {
      const textConflict: ConflictData = {
        regionId: 'test-region',
        field: 'regionText',
        localValue: 'Local text',
        remoteValue: 'Remote text',
        localVersion: 1,
        remoteVersion: 2,
        timestamp: Date.now(),
        conflictId: 'text-conflict'
      };

      const translationConflict: ConflictData = {
        regionId: 'test-region',
        field: 'translation',
        localValue: 'Local translation',
        remoteValue: 'Remote translation',
        localVersion: 1,
        remoteVersion: 2,
        timestamp: Date.now(),
        conflictId: 'translation-conflict'
      };

      const textResult = await conflictResolutionService.showConflictDialog(textConflict);
      const translationResult = await conflictResolutionService.showConflictDialog(translationConflict);

      expect(textResult.action).toBe('accept_remote');
      expect(translationResult.action).toBe('accept_remote');
    });

    it('should handle empty values', async () => {
      const conflictData: ConflictData = {
        regionId: 'test-region',
        field: 'regionText',
        localValue: '',
        remoteValue: 'Some remote text',
        localVersion: 1,
        remoteVersion: 2,
        timestamp: Date.now(),
        conflictId: 'empty-conflict'
      };

      const result = await conflictResolutionService.showConflictDialog(conflictData);
      expect(result.action).toBe('accept_remote');
    });
  });
}); 