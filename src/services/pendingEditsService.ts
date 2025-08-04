export interface PendingEdit {
  regionId: string;
  field: 'regionText' | 'translation' | 'bounds';
  startedAt: Date;
  lastActivity: Date;
  baseline?: Record<string, unknown>; // Original region state when edit started (for conflict detection)
}

/**
 * Service to track which regions/fields the user is actively editing
 * This prevents remote changes from overwriting active user work
 */
export class PendingEditsService {
  private pendingEdits = new Map<string, PendingEdit>();

  /**
   * Mark the start of editing a specific region field
   */
  startEdit(regionId: string, field: string): void {
    if (!this.isValidField(field)) {
      throw new Error(`Invalid field: ${field}`);
    }

    const key = this.getKey(regionId, field);
    const now = new Date();
    
    this.pendingEdits.set(key, {
      regionId,
      field: field as PendingEdit['field'],
      startedAt: now,
      lastActivity: now,
    });
  }

  /**
   * Mark the end of editing a specific region field
   */
  endEdit(regionId: string, field: string): void {
    if (!this.isValidField(field)) {
      throw new Error(`Invalid field: ${field}`);
    }

    const key = this.getKey(regionId, field);
    this.pendingEdits.delete(key);
  }

  /**
   * Update the last activity timestamp for an active edit
   */
  updateActivity(regionId: string, field: string): void {
    if (!this.isValidField(field)) {
      throw new Error(`Invalid field: ${field}`);
    }

    const key = this.getKey(regionId, field);
    const existing = this.pendingEdits.get(key);
    
    if (existing) {
      existing.lastActivity = new Date();
    }
  }

  /**
   * Check if a region/field is currently being edited
   */
  isEditing(regionId: string, field?: string): boolean {
    if (field) {
      const key = this.getKey(regionId, field);
      return this.pendingEdits.has(key);
    }
    
    // Check if ANY field for this region is being edited
    for (const edit of this.pendingEdits.values()) {
      if (edit.regionId === regionId) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get all currently active pending edits
   */
  getActivePendingEdits(): PendingEdit[] {
    return Array.from(this.pendingEdits.values());
  }

  /**
   * Clean up expired edits (older than 5 minutes of inactivity)
   */
  cleanup(): void {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    for (const [key, edit] of this.pendingEdits.entries()) {
      if (edit.lastActivity < fiveMinutesAgo) {
        this.pendingEdits.delete(key);
      }
    }
  }

  /**
   * Clear all pending edits (useful for testing)
   */
  clear(): void {
    this.pendingEdits.clear();
  }

  /**
   * Private helper to generate consistent keys
   */
  private getKey(regionId: string, field: string): string {
    return `${regionId}:${field}`;
  }

  /**
   * Private helper to validate field types
   */
  private isValidField(field: string): field is PendingEdit['field'] {
    return field === 'regionText' || field === 'translation' || field === 'bounds';
  }
}

// Export a singleton instance
export const pendingEditsService = new PendingEditsService(); 