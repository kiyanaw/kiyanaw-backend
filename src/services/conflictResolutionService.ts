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
}

class ConflictResolutionService {
  private activeConflicts = new Map<string, ConflictData>();
  
  async showConflictDialog(conflict: ConflictData): Promise<ConflictResolutionResult> {
    const conflictKey = `${conflict.regionId}:${conflict.field}`;
    
    this.activeConflicts.set(conflictKey, conflict);
    
    const result = await conflictDialogManager.showDialog(conflict);
    
    this.activeConflicts.delete(conflictKey);
    return result;
  }
  
  hasActiveConflict(regionId: string, field: string): boolean {
    const conflictKey = `${regionId}:${field}`;
    return this.activeConflicts.has(conflictKey);
  }
  
  dismissConflict(regionId: string, field: string): void {
    const conflictKey = `${regionId}:${field}`;
    this.activeConflicts.delete(conflictKey);
  }
}

export const conflictResolutionService = new ConflictResolutionService(); 