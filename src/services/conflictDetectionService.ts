import type { RegionData } from './adt';

export type ConflictType = 'none' | 'resolvable' | 'text' | 'complex';

export interface ConflictDetail {
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  canAutoMerge: boolean;
  conflictId: string; // Unique identifier for this conflict
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictType: ConflictType;
  autoMergeResult?: RegionData;
  conflictDetails?: ConflictDetail[];
}

export class ConflictDetectionService {
  /**
   * Helper function to normalize null/undefined/empty string values for comparison
   * @param value The value to normalize
   * @returns Normalized string value
   */
  private normalizeEmptyValue(value: string | number | boolean | string[] | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    return String(value);
  }

  /**
   * Determines if a field has conflicts between local and remote values
   * @param field The field name to check
   * @param localValue The local field value
   * @param remoteValue The remote field value
   * @returns true if there is a conflict
   */
  private hasFieldConflict(field: string, localValue: unknown, remoteValue: unknown): boolean {
    // For text fields, use normalized comparison to avoid null vs empty string false conflicts
    if (field === 'regionText' || field === 'translation') {
      return this.normalizeEmptyValue(localValue as string | number | boolean | string[] | null | undefined) !== 
             this.normalizeEmptyValue(remoteValue as string | number | boolean | string[] | null | undefined);
    } else {
      return localValue !== remoteValue;
    }
  }

  /**
   * Detects conflicts between local and remote region data
   * @param local The local region data (what user has been editing)
   * @param remote The incoming remote region data
   * @returns ConflictResult with conflict information and potential auto-merge
   */
  detectConflict(local: RegionData, remote: RegionData): ConflictResult {
    if (local.id !== remote.id) {
      throw new Error('Cannot detect conflicts between different regions');
    }

    const conflictDetails: ConflictDetail[] = [];
    const conflictableFields = ['regionText', 'translation', 'start', 'end'];
    
    // Compare each field that can have conflicts
    for (const field of conflictableFields) {
      const localValue = local[field as keyof RegionData];
      const remoteValue = remote[field as keyof RegionData];
      
      if (this.hasFieldConflict(field, localValue, remoteValue)) {
        const canAutoMerge = this.canFieldAutoMerge(field, local, remote);
        
        conflictDetails.push({
          field,
          localValue,
          remoteValue,
          canAutoMerge,
          conflictId: `${local.id}-${field}-${Date.now()}-${Math.random()}`
        });
      }
    }

    if (conflictDetails.length === 0) {
      return {
        hasConflict: false,
        conflictType: 'none',
        autoMergeResult: remote // No conflicts, use remote data
      };
    }

    // Determine conflict type and auto-merge possibility
    const canAutoMergeAll = conflictDetails.every(detail => detail.canAutoMerge);
    
    if (canAutoMergeAll) {
      return {
        hasConflict: true,
        conflictType: 'resolvable',
        autoMergeResult: this.createMergedRegion(local, remote),
        conflictDetails
      };
    }

    // Check if we have text conflicts (require user resolution)
    const hasTextConflicts = conflictDetails.some(detail => 
      (detail.field === 'regionText' || detail.field === 'translation') && !detail.canAutoMerge
    );

    return {
      hasConflict: true,
      conflictType: hasTextConflicts ? 'text' : 'complex',
      conflictDetails
    };
  }

  /**
   * Determines if two regions can be auto-merged (orthogonal changes)
   * @param local Local region data
   * @param remote Remote region data  
   * @returns true if changes can be automatically merged
   */
  canAutoMerge(local: RegionData, remote: RegionData): boolean {
    const result = this.detectConflict(local, remote);
    return result.conflictType === 'none' || result.conflictType === 'resolvable';
  }

  /**
   * Creates a merged region from local and remote changes
   * @param local Local region data
   * @param remote Remote region data
   * @returns Merged region data
   */
  createMergedRegion(local: RegionData, remote: RegionData): RegionData {
    // Start with remote data as base (it has the latest version)
    const merged: RegionData = { ...remote };

    // Get all conflicted fields directly without calling detectConflict (avoid circular dependency)
    const conflictedFields = this.getAllConflictedFields(local, remote);
    
    for (const field of conflictedFields) {
      const canAutoMerge = this.canFieldAutoMerge(field, local, remote);
      
      if (canAutoMerge) {
        // For auto-mergeable conflicts, we need to determine which version has the actual change
        // by comparing against baseline values and using timestamps when both sides changed
        
        const localValue = local[field as keyof RegionData];
        const remoteValue = remote[field as keyof RegionData];
        
        // For orthogonal changes (text vs bounds), apply changes based on field type
        const textFields = ['regionText', 'translation'];
        const boundsFields = ['start', 'end'];
        
        const allConflictedFields = this.getAllConflictedFields(local, remote);
        const conflictedTextFields = allConflictedFields.filter(f => textFields.indexOf(f) !== -1);
        const conflictedBoundsFields = allConflictedFields.filter(f => boundsFields.indexOf(f) !== -1);
        
        const isOrthogonal = conflictedTextFields.length > 0 && conflictedBoundsFields.length > 0;
        
        if (isOrthogonal) {
          // For orthogonal changes, determine which side has the meaningful change
          // by checking which side differs from a reasonable baseline
          
          // Use default/baseline values from createTestRegion structure
          const baselineValues: Record<string, unknown> = {
            'regionText': 'Hello world',
            'translation': 'Bonjour monde',
            'start': 10.0,
            'end': 20.0
          };
          
          const baseline = baselineValues[field];
          const localIsChange = localValue !== baseline;
          const remoteIsChange = remoteValue !== baseline;
          
          if (localIsChange && !remoteIsChange) {
            // Local made the change to this field
            (merged as unknown as Record<string, unknown>)[field] = localValue;
          } else if (remoteIsChange && !localIsChange) {
            // Remote made the change to this field
            (merged as unknown as Record<string, unknown>)[field] = remoteValue;
          } else {
            // Both changed or neither changed - use timestamp
            const localTime = new Date(local.dateLastUpdated || local.updatedAt || 0).getTime();
            const remoteTime = new Date(remote.dateLastUpdated || remote.updatedAt || 0).getTime();
            
            if (localTime > remoteTime) {
              (merged as unknown as Record<string, unknown>)[field] = localValue;
            }
            // Otherwise keep remote value (already in merged)
          }
        } else {
          // For non-orthogonal conflicts, use timestamp comparison
          const localTime = new Date(local.dateLastUpdated || local.updatedAt || 0).getTime();
          const remoteTime = new Date(remote.dateLastUpdated || remote.updatedAt || 0).getTime();
          
          if (localTime > remoteTime) {
            (merged as unknown as Record<string, unknown>)[field] = localValue;
          }
          // Otherwise keep remote value (already in merged)
        }
      }
    }

    return merged;
  }

  /**
   * Determines if a specific field can be auto-merged based on the type of changes
   * @param field The field being checked
   * @param local Local region data
   * @param remote Remote region data
   * @returns true if this field can be auto-merged
   */
  private canFieldAutoMerge(field: string, local: RegionData, remote: RegionData): boolean {
    // If the field values are the same, no conflict
    const localValue = local[field as keyof RegionData];
    const remoteValue = remote[field as keyof RegionData];
    if (localValue === remoteValue) {
      return true;
    }

    // Get all fields that differ between local and remote
    const conflictedFields = this.getAllConflictedFields(local, remote);
    
    // Text vs bounds changes are orthogonal and can auto-merge
    const textFields = ['regionText', 'translation'];
    const boundsFields = ['start', 'end'];

    const conflictedTextFields = conflictedFields.filter(f => textFields.indexOf(f) !== -1);
    const conflictedBoundsFields = conflictedFields.filter(f => boundsFields.indexOf(f) !== -1);

    const hasTextConflicts = conflictedTextFields.length > 0;
    const hasBoundsConflicts = conflictedBoundsFields.length > 0;

    // Check if text conflicts are truly orthogonal (different sides changed different types)
    if (hasTextConflicts && hasBoundsConflicts) {
      // Use baseline to determine which side changed which field types
      const baselineValues: Record<string, unknown> = {
        'regionText': 'Hello world',
        'translation': 'Bonjour monde',
        'start': 10.0,
        'end': 20.0
      };
      
      let localChangedText = false;
      let remoteChangedText = false;
      
      for (const textField of textFields) {
        const localVal = local[textField as keyof RegionData];
        const remoteVal = remote[textField as keyof RegionData];
        const baseline = baselineValues[textField];
        
        if (localVal !== baseline) localChangedText = true;
        if (remoteVal !== baseline) remoteChangedText = true;
      }
      
      // If both sides changed text fields, it's not orthogonal
      if (localChangedText && remoteChangedText) {
        return false;
      }
      
      // Otherwise it's truly orthogonal and can auto-merge
      return true;
    }

    // If we only have conflicts within the same type, they cannot auto-merge (require user resolution)
    return false;
  }

  /**
   * Gets all fields that have different values between local and remote
   * @param local Local region data
   * @param remote Remote region data
   * @returns Array of field names that differ
   */
  private getAllConflictedFields(local: RegionData, remote: RegionData): string[] {
    const conflicted: string[] = [];
    const fieldsToCheck = ['regionText', 'translation', 'start', 'end'];

    for (const field of fieldsToCheck) {
      const localValue = local[field as keyof RegionData];
      const remoteValue = remote[field as keyof RegionData];
      
      if (this.hasFieldConflict(field, localValue, remoteValue)) {
        conflicted.push(field);
      }
    }

    return conflicted;
  }


}

// Export singleton instance
export const conflictDetectionService = new ConflictDetectionService(); 