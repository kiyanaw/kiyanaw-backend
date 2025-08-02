import { PendingEditsService, type PendingEdit } from './pendingEditsService';

describe('PendingEditsService', () => {
  let service: PendingEditsService;

  beforeEach(() => {
    service = new PendingEditsService();
    // Clear any existing edits
    service.clear();
  });

  describe('startEdit', () => {
    it('should start tracking an edit for a valid field', () => {
      const before = new Date();
      service.startEdit('region-1', 'regionText');
      const after = new Date();

      const edits = service.getActivePendingEdits();
      expect(edits).toHaveLength(1);
      expect(edits[0]).toEqual({
        regionId: 'region-1',
        field: 'regionText',
        startedAt: expect.any(Date),
        lastActivity: expect.any(Date),
      });

      // Verify timestamps are reasonable
      expect(edits[0].startedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(edits[0].startedAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(edits[0].lastActivity).toEqual(edits[0].startedAt);
    });

    it('should handle multiple edits for different regions', () => {
      service.startEdit('region-1', 'regionText');
      service.startEdit('region-2', 'translation');

      const edits = service.getActivePendingEdits();
      expect(edits).toHaveLength(2);
      
      const regionIds = edits.map(e => e.regionId);
      expect(regionIds).toContain('region-1');
      expect(regionIds).toContain('region-2');
    });

    it('should handle multiple edits for different fields of same region', () => {
      service.startEdit('region-1', 'regionText');
      service.startEdit('region-1', 'translation');

      const edits = service.getActivePendingEdits();
      expect(edits).toHaveLength(2);
      
      const fields = edits.map(e => e.field);
      expect(fields).toContain('regionText');
      expect(fields).toContain('translation');
    });

    it('should overwrite existing edit for same region/field', () => {
      service.startEdit('region-1', 'regionText');
      const firstEdit = service.getActivePendingEdits()[0];
      
      // Wait a bit and start again
      setTimeout(() => {
        service.startEdit('region-1', 'regionText');
        const secondEdit = service.getActivePendingEdits()[0];
        
        expect(service.getActivePendingEdits()).toHaveLength(1);
        expect(secondEdit.startedAt.getTime()).toBeGreaterThan(firstEdit.startedAt.getTime());
      }, 10);
    });

    it('should throw error for invalid field', () => {
      expect(() => service.startEdit('region-1', 'invalidField')).toThrow('Invalid field: invalidField');
    });

    it('should accept all valid field types', () => {
      expect(() => service.startEdit('region-1', 'regionText')).not.toThrow();
      expect(() => service.startEdit('region-2', 'translation')).not.toThrow();
      expect(() => service.startEdit('region-3', 'bounds')).not.toThrow();
      
      expect(service.getActivePendingEdits()).toHaveLength(3);
    });
  });

  describe('endEdit', () => {
    it('should remove an active edit', () => {
      service.startEdit('region-1', 'regionText');
      expect(service.getActivePendingEdits()).toHaveLength(1);

      service.endEdit('region-1', 'regionText');
      expect(service.getActivePendingEdits()).toHaveLength(0);
    });

    it('should only remove the specified edit', () => {
      service.startEdit('region-1', 'regionText');
      service.startEdit('region-1', 'translation');
      service.startEdit('region-2', 'regionText');

      service.endEdit('region-1', 'regionText');

      const edits = service.getActivePendingEdits();
      expect(edits).toHaveLength(2);
      
      const remaining = edits.map(e => `${e.regionId}:${e.field}`);
      expect(remaining).toContain('region-1:translation');
      expect(remaining).toContain('region-2:regionText');
      expect(remaining).not.toContain('region-1:regionText');
    });

    it('should handle ending non-existent edit gracefully', () => {
      expect(() => service.endEdit('region-1', 'regionText')).not.toThrow();
      expect(service.getActivePendingEdits()).toHaveLength(0);
    });

    it('should throw error for invalid field', () => {
      expect(() => service.endEdit('region-1', 'invalidField')).toThrow('Invalid field: invalidField');
    });
  });

  describe('updateActivity', () => {
    it('should update lastActivity timestamp for existing edit', () => {
      service.startEdit('region-1', 'regionText');
      const initialEdit = service.getActivePendingEdits()[0];
      
      // Wait a bit and update activity
      setTimeout(() => {
        service.updateActivity('region-1', 'regionText');
        const updatedEdit = service.getActivePendingEdits()[0];
        
        expect(updatedEdit.startedAt).toEqual(initialEdit.startedAt);
        expect(updatedEdit.lastActivity.getTime()).toBeGreaterThan(initialEdit.lastActivity.getTime());
      }, 10);
    });

    it('should do nothing for non-existent edit', () => {
      expect(() => service.updateActivity('region-1', 'regionText')).not.toThrow();
      expect(service.getActivePendingEdits()).toHaveLength(0);
    });

    it('should throw error for invalid field', () => {
      expect(() => service.updateActivity('region-1', 'invalidField')).toThrow('Invalid field: invalidField');
    });
  });

  describe('isEditing', () => {
    beforeEach(() => {
      service.startEdit('region-1', 'regionText');
      service.startEdit('region-1', 'translation');
      service.startEdit('region-2', 'bounds');
    });

    it('should return true for specific field being edited', () => {
      expect(service.isEditing('region-1', 'regionText')).toBe(true);
      expect(service.isEditing('region-1', 'translation')).toBe(true);
      expect(service.isEditing('region-2', 'bounds')).toBe(true);
    });

    it('should return false for specific field not being edited', () => {
      expect(service.isEditing('region-1', 'bounds')).toBe(false);
      expect(service.isEditing('region-2', 'regionText')).toBe(false);
      expect(service.isEditing('region-3', 'regionText')).toBe(false);
    });

    it('should return true if any field of region is being edited', () => {
      expect(service.isEditing('region-1')).toBe(true); // has regionText + translation
      expect(service.isEditing('region-2')).toBe(true); // has bounds
    });

    it('should return false if no fields of region are being edited', () => {
      expect(service.isEditing('region-3')).toBe(false);
      expect(service.isEditing('region-999')).toBe(false);
    });
  });

  describe('getActivePendingEdits', () => {
    it('should return empty array when no edits active', () => {
      expect(service.getActivePendingEdits()).toEqual([]);
    });

    it('should return all active edits', () => {
      service.startEdit('region-1', 'regionText');
      service.startEdit('region-2', 'translation');
      service.startEdit('region-3', 'bounds');

      const edits = service.getActivePendingEdits();
      expect(edits).toHaveLength(3);
      
      const regions = edits.map(e => e.regionId);
      expect(regions).toContain('region-1');
      expect(regions).toContain('region-2');
      expect(regions).toContain('region-3');
    });

    it('should return a copy, not the internal state', () => {
      service.startEdit('region-1', 'regionText');
      
      const edits1 = service.getActivePendingEdits();
      const edits2 = service.getActivePendingEdits();
      
      expect(edits1).not.toBe(edits2); // Different array instances
      expect(edits1).toEqual(edits2); // Same content
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      // Mock Date.now to control time
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should remove edits older than 5 minutes', () => {
      const now = new Date('2024-01-01T12:00:00Z');
      jest.setSystemTime(now);

      // Start some edits
      service.startEdit('region-1', 'regionText');
      service.startEdit('region-2', 'translation');

      // Advance time by 6 minutes
      jest.setSystemTime(new Date('2024-01-01T12:06:00Z'));

      // Add a new edit (should not be cleaned up)
      service.startEdit('region-3', 'bounds');

      expect(service.getActivePendingEdits()).toHaveLength(3);

      // Cleanup should remove the old edits
      service.cleanup();

      const remaining = service.getActivePendingEdits();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].regionId).toBe('region-3');
    });

    it('should keep edits updated within 5 minutes', () => {
      const now = new Date('2024-01-01T12:00:00Z');
      jest.setSystemTime(now);

      service.startEdit('region-1', 'regionText');

      // Advance time by 3 minutes and update activity
      jest.setSystemTime(new Date('2024-01-01T12:03:00Z'));
      service.updateActivity('region-1', 'regionText');

      // Advance time by another 3 minutes (6 total, but 3 since last activity)
      jest.setSystemTime(new Date('2024-01-01T12:06:00Z'));

      service.cleanup();

      // Should still be there because last activity was 3 minutes ago
      expect(service.getActivePendingEdits()).toHaveLength(1);
    });

    it('should handle empty edits gracefully', () => {
      expect(() => service.cleanup()).not.toThrow();
      expect(service.getActivePendingEdits()).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should remove all pending edits', () => {
      service.startEdit('region-1', 'regionText');
      service.startEdit('region-2', 'translation');
      service.startEdit('region-3', 'bounds');

      expect(service.getActivePendingEdits()).toHaveLength(3);

      service.clear();

      expect(service.getActivePendingEdits()).toHaveLength(0);
    });

    it('should handle clearing empty service', () => {
      expect(() => service.clear()).not.toThrow();
      expect(service.getActivePendingEdits()).toHaveLength(0);
    });
  });
}); 