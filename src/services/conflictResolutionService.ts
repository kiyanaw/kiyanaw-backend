type ConflictValue = string | number | boolean;

export interface ConflictData {
  regionId: string;
  // Legacy single field support (for backward compatibility)
  field?: string;
  localValue?: ConflictValue;
  remoteValue?: ConflictValue;
  // New multi-field support
  conflictingFields?: Array<{
    field: string;
    localValue: ConflictValue;
    remoteValue: ConflictValue;
    fieldType: 'text' | 'number' | 'boolean';
  }>;
  localVersion: number;
  remoteVersion: number;
  remoteUserLastUpdated?: string; // The user who last updated the remote version
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
    
    console.log('🔥 CONFLICT DETECTED - Showing real dialog:', {
      regionId: conflict.regionId,
      field: conflict.field,
      localValue: typeof conflict.localValue === 'string' 
        ? conflict.localValue.substring(0, 50) + '...' 
        : conflict.localValue,
      remoteValue: typeof conflict.remoteValue === 'string' 
        ? conflict.remoteValue.substring(0, 50) + '...' 
        : conflict.remoteValue,
      localVersion: conflict.localVersion,
      remoteVersion: conflict.remoteVersion
    });
    
    try {
      // Use the global dialog manager to show the real UI dialog
      const { conflictDialogManager } = await import('./conflictDialogManager');
      const result = await conflictDialogManager.showDialog(conflict);
      
      console.log('🔥 User resolved conflict:', result);
      this.activeConflicts.delete(conflictKey);
      return result;
    } catch (error) {
      console.error('Error showing conflict dialog:', error);
      // Fallback to accepting remote changes if dialog fails
      this.activeConflicts.delete(conflictKey);
      return { action: 'accept_remote' };
    }
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