import { services } from '../services';
import { UpdateTranscriptionUseCase } from './update-transcription';
import type { ConflictData } from '../services/conflictResolutionService';
import Timeout from 'smart-timeout';

/**
 * Check if an error is a version conflict error from DynamoDB/AppSync
 */
function isVersionConflictError(error: any): boolean {
  const errorMessage = error?.message || error?.toString() || '';
  
  // Check direct error message for various version conflict indicators
  const directMatch = errorMessage.includes('ConditionalCheckFailedException') ||
                     errorMessage.includes('OptimisticLockException') ||
                     errorMessage.includes('ConditionalCheckFailed') ||
                     errorMessage.includes('ConflictException') ||
                     errorMessage.includes('version') && errorMessage.includes('conflict');
  
  // Check GraphQL errors array (AppSync format)
  const graphqlMatch = error?.errors && error.errors.some((e: any) => {
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
  });
  
  console.log(`🔍 Version conflict check: direct=${directMatch}, graphql=${graphqlMatch}`, {
    errorMessage,
    errorCount: error?.errors?.length || 0,
    firstError: error?.errors?.[0]?.message || 'none',
    firstErrorType: error?.errors?.[0]?.errorType || 'none'
  });
  
  return directMatch || graphqlMatch;
}



/**
 * Determine if this is a "real" content conflict or just a version mismatch
 * Uses the store's current state (which reflects latest remote data from subscriptions)
 */
async function analyzeConflict(
  regionId: string, 
  field: string,
  attemptedValue: string,
  localVersion: number,
  store: any
): Promise<{ isRealConflict: boolean; remoteValue?: string; remoteVersion?: number; remoteUser?: string }> {
  try {
    // Get remote values that were stored from the last subscription update
    // (These are preserved even when we protect the user's typing)
    const remoteValue = field === 'regionText' 
      ? store.getRemoteRegionText(regionId)
      : store.getRemoteRegionTranslation(regionId);
    const remoteVersion = store.getRegionVersion(regionId);
    const remoteUser = store.getRemoteRegionUser(regionId);
    
    // If values are the same, it's just a version mismatch (auto-retry)
    if (remoteValue === attemptedValue) {
      console.log('🔄 Version mismatch but same content - will auto-retry');
      return { 
        isRealConflict: false, 
        remoteValue, 
        remoteVersion,
        remoteUser
      };
    }
    
    // If values differ, it's a real conflict (show dialog)
    console.log('⚠️ Real content conflict detected:', {
      attemptedValue: attemptedValue?.substring(0, 50) + '...',
      remoteValue: remoteValue?.substring(0, 50) + '...'
    });
    
    return { 
      isRealConflict: true, 
      remoteValue, 
      remoteVersion,
      remoteUser
    };
    
  } catch (error) {
    console.error('Failed to analyze conflict:', error);
    // If we can't analyze, assume it's a real conflict to be safe
    return { isRealConflict: true };
  }
}

/**
 * Create structured conflict data for resolution
 */
function createConflictData(
  regionId: string,
  field: string,
  localValue: string,
  remoteValue: string,
  localVersion: number,
  remoteVersion: number,
  remoteUser?: string
): ConflictData {
  return {
    regionId,
    field,
    localValue,
    remoteValue,
    localVersion,
    remoteVersion,
    remoteUserLastUpdated: remoteUser,
    timestamp: Date.now(),
    conflictId: `${regionId}-${field}-${Date.now()}-${Math.random()}`
  };
}

interface UpdateRegionTextConfig {
  regionId: string;
  text: string;
  field: 'regionText' | 'translation';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any; // ZustandStore with text editing capabilities
  services: typeof services;
}

// Debounced save state at module level
const pendingSaves = new Map<string, string>();

export class UpdateRegionTextUseCase {
  private config: UpdateRegionTextConfig;

  constructor(config: UpdateRegionTextConfig) {
    this.config = config;
  }

  validate(): void {
    if (!this.config.regionId) {
      throw new Error('regionId is required');
    }
  }

  execute(): void {
    this.validate();

    const { regionId, text, field, store, services } = this.config;

    // Update local store immediately for responsive UI
    if (field === 'regionText') {
      store.setRegionText(regionId, text);
    } else {
      store.setRegionTranslation(regionId, text);
    }

    // Check if user is authenticated
    const user = services.authService.currentUser();
    if (!user) {
      console.warn('User not authenticated, skipping region text update');
      return;
    }

    // Clear any existing timeout for this region
    const existingTimeout = pendingSaves.get(regionId);
    if (existingTimeout) {
      Timeout.clear(existingTimeout);
    }

    // Set up debounced save that grabs fresh analysis at save time
    const timeoutKey = `region-text-save-${regionId}`;
    Timeout.set(timeoutKey, async () => {
      // Prepare update data (moved outside try block for catch access)
      const updateData: {
        regionText?: string;
        translation?: string;
        regionAnalysis?: string[];
      } = field === 'regionText' 
        ? { regionText: text }
        : { translation: text };

      // Get current version for optimistic concurrency control (moved outside try block)
      const currentVersion = store.getRegionVersion(regionId);
      console.log(`🔢 Save attempt for region ${regionId} using version: ${currentVersion}`);
      
      try {
        // Get fresh state at save time

        // If updating main text, include current analysis from store at save time
        if (field === 'regionText') {
          try {
            const region = store.regionById(regionId);
            if (region?.regionAnalysis) {
              updateData.regionAnalysis = region.regionAnalysis;
            }
          } catch (error) {
            console.warn('Could not get analysis from store at save time:', error);
            // Continue without analysis
          }
        }
        
        // Save to database
        await services.regionService.updateRegion(
          regionId,
          updateData,
          user.username,
          currentVersion
        );

        // Remove from pending saves
        pendingSaves.delete(regionId);

        // Update the transcription with metadata
        const region = store.regionById(regionId);
        const updateTranscriptionUseCase = new UpdateTranscriptionUseCase({
          transcriptionId: region.transcriptionId,
          services,
          store: store,
        });
        
        await updateTranscriptionUseCase.execute();

        // End pending edit on successful save
        services.storeService.endPendingEdit(regionId, field);
        console.log('🟢 Ended pending edit for region:', regionId, 'field:', field);
        
      } catch (error) {
        console.error('Failed to save region text:', error);
        pendingSaves.delete(regionId);
        
        // Log detailed error info for debugging
        console.error('Save error details:', {
          regionId,
          currentVersion,
          error: {
            message: (error as any)?.message,
            errors: (error as any)?.errors,
            data: (error as any)?.data,
            name: (error as any)?.name
          }
        });
        
        // Check if this is a version conflict error
        if (isVersionConflictError(error)) {
          console.warn('✅ Version conflict detected, analyzing conflict type...', { regionId, error });
          
          try {
            // Analyze the conflict to get remote value details  
            const conflictAnalysis = await analyzeConflict(regionId, field, text, currentVersion, store);
            
            // Always show conflict dialog - user should decide how to resolve
            // Even if content appears the same, the user should be aware someone else was editing
            console.log('🔥 Version conflict detected - showing resolution dialog');
            
            const conflictData = createConflictData(
              regionId,
              field,
              text, // User's attempted value
              conflictAnalysis.remoteValue || '', // Current DB value
              currentVersion, // User's version
              conflictAnalysis.remoteVersion || currentVersion + 1, // DB version
              conflictAnalysis.remoteUser // Remote user who last updated
            );
            
            // Show conflict resolution dialog
            const resolution = await services.conflictResolutionService.showConflictDialog(conflictData);
            
            // Handle user's resolution choice
            if (resolution.action === 'accept_remote') {
              console.log('🔄 User chose to accept remote changes');
              // Update store with remote value and end pending edit
              const remoteValue = conflictAnalysis.remoteValue || '';
              if (field === 'regionText') {
                store.setRegionText(regionId, remoteValue);
              } else {
                store.setRegionTranslation(regionId, remoteValue);
              }
              
              // Update the RTE editor to show the remote content
              const editorKey = `${regionId}:${field === 'regionText' ? 'main' : 'translation'}` as const;
              if (services.rteService.hasEditor(editorKey)) {
                console.log('🔄 Updating RTE editor with remote content');
                services.rteService.setContent(editorKey, remoteValue);
              }
              
              // Update version to match remote version to prevent further conflicts
              if (conflictAnalysis.remoteVersion) {
                store.setRegionVersion(regionId, conflictAnalysis.remoteVersion);
              }
              
              services.storeService.endPendingEdit(regionId, field);
            } else if (resolution.action === 'keep_local') {
              console.log('🔄 User chose to keep their changes - force overwriting remote version');
              
              // For force overwrite, we need the absolute latest version from the database
              // Fetch current region to get the latest version
              const currentRegion = await services.regionService.getRegion(regionId);
              const latestDbVersion = currentRegion?._version || conflictAnalysis.remoteVersion || currentVersion;
              
              await services.regionService.updateRegion(
                regionId,
                updateData,
                user.username,
                latestDbVersion
              );
              services.storeService.endPendingEdit(regionId, field);
            }
            // manual_merge action will be handled in Phase 5
          } catch (conflictError) {
            console.error('Failed to resolve version conflict:', conflictError);
            // Fallback: end pending edit to prevent UI lock
            services.storeService.endPendingEdit(regionId, field);
          }
        }
      }
    }, 3000); // 3 second debounce

    // Store the pending save
    pendingSaves.set(regionId, timeoutKey);
  }
} 