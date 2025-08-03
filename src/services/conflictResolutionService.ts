export interface ConflictData {
  regionId: string;
  field: string;
  localValue: string;
  remoteValue: string;
  localVersion: number;
  remoteVersion: number;
  timestamp: number;
  conflictId: string;
}

export interface ConflictResolutionResult {
  action: 'accept_remote' | 'keep_local' | 'manual_merge';
  resolvedValue?: string;
}

export interface ConflictResolutionService {
  /**
   * Show conflict resolution dialog and return user's choice
   */
  showConflictDialog(conflict: ConflictData): Promise<ConflictResolutionResult>;
  
  /**
   * Check if there's already an active conflict dialog for this region/field
   */
  hasActiveConflict(regionId: string, field: string): boolean;
  
  /**
   * Dismiss any active conflict dialogs for this region/field
   */
  dismissConflict(regionId: string, field: string): void;
}

class ConflictResolutionServiceImpl implements ConflictResolutionService {
  private activeConflicts = new Map<string, ConflictData>();
  
  async showConflictDialog(conflict: ConflictData): Promise<ConflictResolutionResult> {
    const conflictKey = `${conflict.regionId}:${conflict.field}`;
    
    // Store the active conflict
    this.activeConflicts.set(conflictKey, conflict);
    
    // TODO: Phase 4 - Show actual UI dialog
    // For now, we'll log the conflict and default to accepting remote
    console.log('🔥 CONFLICT DETECTED - Would show dialog:', {
      regionId: conflict.regionId,
      field: conflict.field,
      localValue: conflict.localValue,
      remoteValue: conflict.remoteValue,
      localVersion: conflict.localVersion,
      remoteVersion: conflict.remoteVersion
    });
    
    // Simulate user choosing to accept remote changes for now
    // In Phase 4, this will be replaced with actual UI dialog
    const result: ConflictResolutionResult = {
      action: 'accept_remote'
    };
    
    // Clean up
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

export const conflictResolutionService = new ConflictResolutionServiceImpl(); 