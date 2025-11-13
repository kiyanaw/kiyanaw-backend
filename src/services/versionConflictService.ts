import { services } from './index';
import type { ConflictData } from './conflictResolutionService';
import type { ConflictDetail } from './conflictDetectionService';
type ConflictValue = string | number | boolean;
import type { RegionData } from './adt';
import type { LazyRegion } from '../models';

// Types for error handling
type ErrorObject = {
  message?: string;
  errors?: Array<{ 
    message?: string; 
    errorMessage?: string; 
    errorType?: string; 
  }>;
  toString?: () => string;
};

// Type for region-like objects that may be incomplete
type RegionLike = Partial<Omit<RegionData, 'regionAnalysis'> & Omit<LazyRegion, 'regionAnalysis'> & {
  regionAnalysis?: import('./spellCheckerService').WordAnalysis[] | string | null;
}>;

/**
 * Check if an error is a version conflict error from DynamoDB/AppSync
 */
export function isVersionConflictError(error: unknown): boolean {
  const errorObj = error as ErrorObject;
  const errorMessage = errorObj?.message || errorObj?.toString?.() || '';
  
  // Check direct error message for various version conflict indicators
  const directMatch = errorMessage.includes('ConditionalCheckFailedException') ||
                     errorMessage.includes('OptimisticLockException') ||
                     errorMessage.includes('ConditionalCheckFailed') ||
                     errorMessage.includes('ConflictException') ||
                     errorMessage.includes('version') && errorMessage.includes('conflict');
  
  // Check GraphQL errors array (AppSync format)
  const graphqlMatch = errorObj?.errors?.some((e) => {
    const msg = e.message || e.errorMessage || '';
    return msg.includes('ConditionalCheckFailedException') ||
           msg.includes('OptimisticLockException') ||
           msg.includes('ConditionalCheckFailed') ||
           msg.includes('ConflictException') ||
           msg.includes('The conditional request failed') ||
           msg.includes('version') && msg.includes('conflict') ||
           msg.includes('version') && msg.includes('mismatch') ||
           msg.includes('Conflict') ||
           // AWS Amplify DataStore specific errors
           e.errorType === 'ConflictUnhandled' ||
           e.errorType === 'Conflict';
  }) ?? false;
  
  return directMatch || graphqlMatch;
}

/**
 * Analyze version conflict to determine what fields actually conflict
 */
export async function analyzeRegionConflict(
  regionId: string, 
  attemptedChanges: Record<string, unknown>,
  localVersion: number,
  store: typeof services.storeService
): Promise<{ 
  isRealConflict: boolean; 
  remoteRegion?: RegionLike;
  remoteVersion?: number; 
  remoteUser?: string;
  conflictingFields?: Array<{
    field: string;
    localValue: unknown;
    remoteValue: unknown;
    fieldType: 'text' | 'number' | 'boolean';
  }>;
}> {
  try {
    // Get current local region data from store
    const localRegion = store.regionById(regionId);
    if (!localRegion) {
      console.error('Local region not found in store:', regionId);
      return { isRealConflict: true };
    }

    // Fetch the current remote region data directly from the database
    const regionService = services.regionService;
    const remoteRegion = await regionService.getRegion(regionId);
    
    if (!remoteRegion) {
      console.error('Remote region not found:', regionId);
      return { isRealConflict: true };
    }

    console.log('🔍 Analyzing conflict:', {
      regionId,
      localVersion,
      remoteVersion: remoteRegion._version,
      attemptedChanges: Object.keys(attemptedChanges)
    });

    // Build local region data with the attempted changes
    const localRegionData = {
      ...localRegion,
      ...attemptedChanges,
      _version: localVersion
    };

    // Use ConflictDetectionService to detect all conflicts
    const conflictDetectionService = services.conflictDetectionService;
    const conflictResult = conflictDetectionService.detectConflict(localRegionData, remoteRegion);

    if (!conflictResult.hasConflict || !conflictResult.conflictDetails) {
      console.log('🟢 No real conflicts detected - just version mismatch');
      return { 
        isRealConflict: false,
        remoteRegion,
        remoteVersion: remoteRegion._version,
        remoteUser: remoteRegion.userLastUpdated
      };
    }

    console.log('⚠️ Real content conflicts detected:', {
      conflictCount: conflictResult.conflictDetails.length,
      fields: conflictResult.conflictDetails.map((c: ConflictDetail) => c.field)
    });

    return {
      isRealConflict: true,
      remoteRegion,
      remoteVersion: remoteRegion._version,
      remoteUser: remoteRegion.userLastUpdated,
      conflictingFields: conflictResult.conflictDetails.map((conflict: ConflictDetail) => ({
        field: conflict.field,
        localValue: conflict.localValue,
        remoteValue: conflict.remoteValue,
        fieldType: typeof conflict.localValue === 'number' ? 'number' : 'text'
      }))
    };

  } catch (error) {
    console.error('Error analyzing conflict:', error);
    return { isRealConflict: true };
  }
}

/**
 * Create structured conflict data for resolution
 */
export function createConflictData(
  regionId: string,
  primaryField: string,
  localValue: unknown,
  remoteValue: unknown,
  localVersion: number,
  remoteVersion: number,
  remoteUser?: string,
  conflictingFields?: Array<{
    field: string;
    localValue: unknown;
    remoteValue: unknown;
    fieldType: 'text' | 'number' | 'boolean';
  }>
): ConflictData {
  return {
    regionId,
    // Legacy single field support (for backward compatibility)
    field: primaryField,
    localValue: localValue as ConflictValue,
    remoteValue: remoteValue as ConflictValue,
    // New multi-field support
    conflictingFields: conflictingFields?.map(field => ({
      ...field,
      localValue: field.localValue as ConflictValue,
      remoteValue: field.remoteValue as ConflictValue
    })),
    localVersion,
    remoteVersion,
    remoteUserLastUpdated: remoteUser,
    timestamp: Date.now(),
    conflictId: `${regionId}-${primaryField}-${Date.now()}-${Math.random()}`
  };
}

/**
 * Handle conflict resolution with common flow for both text and bounds
 */
export async function handleVersionConflict(
  regionId: string,
  attemptedChanges: Record<string, unknown>,
  primaryField: string,
  localVersion: number,
  store: typeof services.storeService,
  onAcceptRemote: (remoteRegion: RegionLike) => Promise<void>,
  onKeepLocal: (latestVersion: number) => Promise<void>
): Promise<void> {
  try {
    // Analyze the conflict to get remote value details  
    const conflictAnalysis = await analyzeRegionConflict(regionId, attemptedChanges, localVersion, store);
    
    // Always show conflict dialog - user should decide how to resolve
    const primaryLocalValue = attemptedChanges[primaryField];
    const primaryRemoteValue = (conflictAnalysis.remoteRegion as Record<string, unknown>)?.[primaryField];
    
    const conflictData = createConflictData(
      regionId,
      primaryField,
      primaryLocalValue,
      primaryRemoteValue,
      localVersion,
      conflictAnalysis.remoteVersion || localVersion + 1,
      conflictAnalysis.remoteUser,
      conflictAnalysis.conflictingFields
    );
    
    // Show conflict resolution dialog
    const resolution = await services.conflictResolutionService.showConflictDialog(conflictData);
    
    // Handle user's resolution choice
    if (resolution.action === 'accept_remote') {
      console.log('🔄 User chose to accept remote changes');
      
      // Use the most recent conflict data if available (handles live updates)
      if (resolution.resolvedConflictData) {
        console.log('🔄 Using updated conflict data from live dialog:', {
          originalVersion: conflictAnalysis.remoteVersion,
          resolvedVersion: resolution.resolvedConflictData.remoteVersion,
          regionId: resolution.resolvedConflictData.regionId
        });
        
        // Create a synthetic remote region from the resolved conflict data
        const baseRegion = { ...conflictAnalysis.remoteRegion! };
        const fieldUpdates: Record<string, unknown> = {};
        
        // Update the primary field with the resolved value
        fieldUpdates[resolution.resolvedConflictData.field || 'regionText'] = resolution.resolvedConflictData.remoteValue;
        
        // Update conflictingFields if present
        if (resolution.resolvedConflictData.conflictingFields) {
          for (const field of resolution.resolvedConflictData.conflictingFields) {
            fieldUpdates[field.field] = field.remoteValue;
          }
        }
        
        const resolvedRemoteRegion: RegionLike = {
          ...baseRegion,
          ...fieldUpdates,
          _version: resolution.resolvedConflictData.remoteVersion
        };
        
        await onAcceptRemote(resolvedRemoteRegion);
      } else {
        // Fallback to original analysis if no resolved data
        await onAcceptRemote(conflictAnalysis.remoteRegion!);
      }
    } else if (resolution.action === 'keep_local') {
      console.log('🔄 User chose to keep their changes - force overwriting remote version');
      
      // Use the latest version from resolved conflict data if available
      const latestDbVersion = resolution.resolvedConflictData?.remoteVersion || 
                             conflictAnalysis.remoteVersion || 
                             localVersion;
      await onKeepLocal(latestDbVersion);
    }
    // manual_merge action will be handled in Phase 5
  } catch (conflictError) {
    console.error('Failed to resolve version conflict:', conflictError);
    throw conflictError;
  }
} 