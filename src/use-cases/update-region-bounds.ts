import { services } from '../services';
import { UpdateTranscriptionUseCase } from './update-transcription';
import type { User } from '../types/shared';

/**
 * Check if an error is a version conflict error from DynamoDB/AppSync
 */
function isVersionConflictError(error: any): boolean {
  const errorMessage = error?.message || error?.toString() || '';
  return errorMessage.includes('ConditionalCheckFailedException') ||
         errorMessage.includes('OptimisticLockException') ||
         errorMessage.includes('ConditionalCheckFailed') ||
         (error?.errors && error.errors.some((e: any) => 
           e.message?.includes('ConditionalCheckFailedException') ||
           e.message?.includes('OptimisticLockException')
         ));
}

/**
 * Refresh the region version from the database and update local store
 */
async function refreshRegionVersion(regionId: string, store: any): Promise<number> {
  try {
    // For now, just increment the current version as a fallback
    // TODO: In a real implementation, we'd fetch from the database
    const currentVersion = store.getRegionVersion(regionId);
    const newVersion = currentVersion + 1;
    store.setRegionVersion(regionId, newVersion);
    console.warn('Using incremented version as fallback - TODO: implement proper fresh version fetch');
    return newVersion;
  } catch (error) {
    console.error('Failed to refresh region version:', error);
    throw error;
  }
}

interface UpdateRegionBoundsConfig {
  regionId: string;
  newStart: number;
  newEnd: number;
  user: User;
  services: typeof services;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any; // ZustandStore with region management capabilities
}

export class UpdateRegionBounds {
  private config: UpdateRegionBoundsConfig;

  constructor(config: UpdateRegionBoundsConfig) {
    this.config = config;
  }

  validate() {
    if (!this.config.regionId) {
      throw new Error('regionId is required');
    }
    if (this.config.newStart < 0) {
      throw new Error('start time must be >= 0');
    }
    if (this.config.newEnd <= this.config.newStart) {
      throw new Error('end time must be greater than start time');
    }
  }

  async execute() {
    this.validate();

    const { regionId, newStart, newEnd, services, store } = this.config;

    // Check if the region exists
    const existingRegion = store.regionById(regionId);
    if (!existingRegion) {
      console.warn(`Region ${regionId} not found in store, skipping update`);
      return;
    }

    // Check if there's actually a change
    if (existingRegion.start === newStart && existingRegion.end === newEnd) {
      console.log(`Region ${regionId} bounds unchanged, skipping update`);
      return;
    }

    // Update store optimistically (for immediate UI feedback)
    store.updateRegionBounds(regionId, newStart, newEnd);

    // Get current user for audit trail (moved outside try block for catch access)
    const currentUser = services.authService.currentUser();
    const username = currentUser?.username || 'unknown';

    // Get current version for optimistic concurrency control (moved outside try block)
    const currentVersion = store.getRegionVersion(regionId);

    try {
      
      // Save to database with debouncing
      await services.regionService.updateRegion(
        regionId,
        { start: newStart, end: newEnd },
        username,
        currentVersion
      );

      // Update the transcription with metadata  
      const updateTranscriptionUseCase = new UpdateTranscriptionUseCase({
        transcriptionId: existingRegion.transcriptionId,
        services,
        store: store,
      });
      
      await updateTranscriptionUseCase.execute();

    } catch (error) {
      console.error(`❌ Failed to save region ${regionId} bounds:`, error);
      
      // Revert optimistic update on error
      store.updateRegionBounds(regionId, existingRegion.start, existingRegion.end);
      
      // Check if this is a version conflict error
      if (isVersionConflictError(error)) {
        console.warn('Version conflict detected for bounds update, attempting to resolve...', { regionId, error });
        
        try {
          // Try to get a fresh version and retry once
          const freshVersion = await refreshRegionVersion(regionId, store);
          
          if (freshVersion !== currentVersion) {
            console.log(`Retrying bounds save with fresh version ${freshVersion} (was ${currentVersion})`);
            
            // Re-apply the optimistic update
            store.updateRegionBounds(regionId, newStart, newEnd);
            
            // Retry the save with fresh version
            await services.regionService.updateRegion(
              regionId,
              { start: newStart, end: newEnd },
              username,
              freshVersion
            );
            
            console.log('✅ Successfully retried bounds save with fresh version');
            
            // Update transcription after successful retry
            const updateTranscriptionUseCase = new UpdateTranscriptionUseCase({
              transcriptionId: existingRegion.transcriptionId,
              services,
              store: store,
            });
            await updateTranscriptionUseCase.execute();
          } else {
            console.warn('Fresh version is same as current version, skipping retry');
          }
        } catch (retryError) {
          console.error('Failed to retry bounds save after version conflict:', retryError);
          // Make sure we revert again if retry fails
          store.updateRegionBounds(regionId, existingRegion.start, existingRegion.end);
          // TODO: In Phase 6, we could show a user notification about the conflict
        }
      }
    }
  }
} 