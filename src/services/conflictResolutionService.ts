import { conflictDialogManager } from './conflictDialogManager';

export interface ConflictData {
  regionId: string;
  // Legacy single field support (for backward compatibility)
  field?: string;
  localValue?: string | number | boolean;
  remoteValue?: string | number | boolean;
  // New multi-field support
  conflictingFields?: Array<{
    field: string;
    localValue: string | number | boolean;
    remoteValue: string | number | boolean;
    fieldType: 'text' | 'number' | 'boolean';
  }>;
  localVersion: number;
  remoteVersion: number;
  remoteUserLastUpdated?: string;
  timestamp: number;
  conflictId: string;
}

export interface ConflictResolutionResult {
  action: 'accept_remote' | 'keep_local';
  resolvedConflictData?: ConflictData; // Include the final conflict data used for resolution
}

class ConflictResolutionService {
  private activeConflicts = new Map<string, ConflictData>();
  
  async showConflictDialog(conflict: ConflictData): Promise<ConflictResolutionResult> {
    const conflictKey = `${conflict.regionId}:${conflict.field}`;
    
    this.activeConflicts.set(conflictKey, conflict);
    
    const result = await conflictDialogManager.showDialog(conflict);
    
    // Get the most recent conflict data that was resolved against
    const finalConflictData = this.activeConflicts.get(conflictKey) || conflict;
    
    this.activeConflicts.delete(conflictKey);
    
    return {
      ...result,
      resolvedConflictData: finalConflictData
    };
  }
  
  hasActiveConflict(regionId: string, field?: string): boolean {
    if (field) {
      const conflictKey = `${regionId}:${field}`;
      return this.activeConflicts.has(conflictKey);
    }
    
    // Check if any conflict exists for this region
    for (const key of this.activeConflicts.keys()) {
      if (key.startsWith(`${regionId}:`)) {
        return true;
      }
    }
    return false;
  }
  
  getActiveConflict(regionId: string, field: string): ConflictData | undefined {
    const conflictKey = `${regionId}:${field}`;
    return this.activeConflicts.get(conflictKey);
  }
  
  getActiveConflictsForRegion(regionId: string): ConflictData[] {
    const conflicts: ConflictData[] = [];
    for (const [key, conflict] of this.activeConflicts.entries()) {
      if (key.startsWith(`${regionId}:`)) {
        conflicts.push(conflict);
      }
    }
    return conflicts;
  }
  
  async updateActiveConflict(regionId: string, field: string, updatedConflict: ConflictData): Promise<void> {
    const conflictKey = `${regionId}:${field}`;
    
    if (this.activeConflicts.has(conflictKey)) {
      this.activeConflicts.set(conflictKey, updatedConflict);
      
      // Notify the dialog manager about the update
      await conflictDialogManager.updateDialog(updatedConflict);
    }
  }
  
  dismissConflict(regionId: string, field: string): void {
    const conflictKey = `${regionId}:${field}`;
    this.activeConflicts.delete(conflictKey);
  }
}

export const conflictResolutionService = new ConflictResolutionService(); 