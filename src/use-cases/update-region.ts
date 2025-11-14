import { services } from '../services';
import { UpdateTranscriptionUseCase } from './update-transcription';
import { isVersionConflictError, handleVersionConflict } from '../services/versionConflictService';
import type { RegionData } from '../services/adt';
import type { LazyRegion } from '../models';
import type { WordAnalysis } from '../services/adt';
import Timeout from 'smart-timeout';

// Type for changes that can be made to a region
type RegionChanges = {
  regionText?: string;
  translation?: string;
  start?: number;
  end?: number;
  regionAnalysis?: WordAnalysis[]; // New WordAnalysis[] format
};

interface UpdateRegionConfig {
  regionId: string;
  changes: RegionChanges; // e.g., { regionText: "new text" } or { start: 10, end: 20 }
  debounceMs: number;
  primaryField: string; // For conflict resolution UI (regionText, start, etc.)
  pendingEditField?: string; // For text/translation pending edit tracking
  services: typeof services;
  store: typeof services.storeService;
}

// Debounced save state at module level
const pendingSaves = new Map<string, string>();

export class UpdateRegionUseCase {
  private config: UpdateRegionConfig;

  constructor(config: UpdateRegionConfig) {
    this.config = config;
  }

  validate(): void {
    if (!this.config.regionId) {
      throw new Error('regionId is required');
    }
    if (!this.config.changes || Object.keys(this.config.changes).length === 0) {
      throw new Error('changes are required');
    }
    if (!this.config.primaryField) {
      throw new Error('primaryField is required');
    }
  }

  execute(): void {
    this.validate();

    const { regionId, changes, debounceMs, primaryField, pendingEditField, services, store } = this.config;

    // Check if the region exists
    const existingRegion = store.regionById(regionId);
    if (!existingRegion) {
      console.warn(`Region ${regionId} not found in store, skipping update`);
      return;
    }

    // Check if there's actually a change
    const hasChanges = Object.keys(changes).some(field => 
      (existingRegion as unknown as Record<string, unknown>)[field] !== (changes as unknown as Record<string, unknown>)[field]
    );
    
    if (!hasChanges) {
      console.log(`Region ${regionId} unchanged, skipping update`);
      return;
    }

    // Update store optimistically (for immediate UI feedback)
    this.applyChangesToStore(changes, existingRegion, store);

    // Start pending edit tracking for bounds changes
    if (changes.start !== undefined || changes.end !== undefined) {
      services.storeService.startPendingEdit(regionId, 'bounds');
    }

    // Check if user is authenticated
    const user = services.authService.currentUser();
    if (!user) {
      console.warn('User not authenticated, skipping region update');
      return;
    }

    // NEW: If debounceMs is 0, save immediately (called by manager)
    if (debounceMs === 0) {
      this.performSave(existingRegion, user).then(() => {
        // End pending edit if specified
        if (pendingEditField) {
          services.storeService.endPendingEdit(regionId, pendingEditField);
        }
        // End bounds pending edit if this was a bounds operation
        if (changes.start !== undefined || changes.end !== undefined) {
          services.storeService.endPendingEdit(regionId, 'bounds');
        }
      }).catch(error => {
        console.error(`Failed to save region ${regionId}:`, error);
        // Error handling already in performSave
      });
      return;
    }

    // OLD PATH: Debounced save (for backwards compatibility)
    // Clear any existing timeout for this region
    const existingTimeout = pendingSaves.get(regionId);
    if (existingTimeout) {
      Timeout.clear(existingTimeout);
    }

    // Set up debounced save
    const timeoutKey = `region-save-${regionId}-${primaryField}`;
    Timeout.set(timeoutKey, async () => {
      try {
        await this.performSave(existingRegion, user);
      } finally {
        // Clean up the pending save
        pendingSaves.delete(regionId);
        
        // End pending edit if specified
        if (pendingEditField) {
          services.storeService.endPendingEdit(regionId, pendingEditField);
        }
        
        // End bounds pending edit if this was a bounds operation
        if (changes.start !== undefined || changes.end !== undefined) {
          services.storeService.endPendingEdit(regionId, 'bounds');
        }
      }
    }, debounceMs);

    // Store the pending save
    pendingSaves.set(regionId, timeoutKey);
  }

  private applyChangesToStore(changes: RegionChanges, existingRegion: RegionData, store: typeof services.storeService): void {
    // Handle different field types
    Object.keys(changes).forEach(field => {
      const value = (changes as unknown as Record<string, unknown>)[field];
      
      switch (field) {
        case 'regionText':
          store.setRegionText(existingRegion.id, value as string);
          break;
        case 'translation':
          store.setRegionTranslation(existingRegion.id, value as string);
          break;
        case 'start':
        case 'end': {
          // For bounds changes, update both start and end together
          const newStart = changes.start !== undefined ? changes.start : existingRegion.start;
          const newEnd = changes.end !== undefined ? changes.end : existingRegion.end;
          store.updateRegionBounds(existingRegion.id, newStart, newEnd);
          break;
        }
        case 'regionAnalysis':
          store.setRegionAnalysis(existingRegion.id, value as WordAnalysis[]);
          break;
        default:
          console.warn(`Unknown field type for store update: ${field}`);
      }
    });
  }

  private async performSave(existingRegion: RegionData, user: { username: string }): Promise<void> {
    const { regionId, changes, primaryField, services, store } = this.config;
    
    console.log(`💾 UPDATE-REGION: performSave called for ${regionId}`, {
      primaryField,
      changes: Object.keys(changes),
      hasRegionAnalysis: 'regionAnalysis' in changes
    });
    
    // Prepare update data
    const updateData = { ...changes };
    
    // NOTE: Manager now passes regionAnalysis directly in changes if needed
    // We no longer read it from the store to avoid race conditions

    console.log(`💾 UPDATE-REGION: Final updateData to save:`, {
      fields: Object.keys(updateData),
      regionAnalysisType: updateData.regionAnalysis ? typeof updateData.regionAnalysis : 'undefined',
      regionAnalysisLength: Array.isArray(updateData.regionAnalysis) ? updateData.regionAnalysis.length : 'N/A',
      regionAnalysis: updateData.regionAnalysis
    });

    // Get current version for optimistic concurrency control
    const currentVersion = store.getRegionVersion(regionId);

    try {
      // Save to database
      console.log(`🚀 UPDATE-REGION: Calling regionService.updateRegion for ${regionId}`);
      await services.regionService.updateRegion(
        regionId,
        updateData,
        user.username,
        currentVersion
      );
      console.log(`✅ UPDATE-REGION: Successfully saved ${regionId}`);

      // Update the store's version tracking after successful save
      // The database will have incremented the version, so we increment locally too
      store.setRegionVersion(regionId, currentVersion + 1);

      // Update the transcription with metadata
      const updateTranscriptionUseCase = new UpdateTranscriptionUseCase({
        transcriptionId: existingRegion.transcriptionId,
        services,
        store: store,
      });
      
      await updateTranscriptionUseCase.execute();

    } catch (error) {
      console.error(`❌ Failed to save region ${regionId}:`, error);
      
      // Revert optimistic updates on error
      this.revertChangesToStore(changes, existingRegion, store);
      
      // Check if this is a version conflict error
      if (isVersionConflictError(error)) {
        console.warn('✅ Version conflict detected, showing resolution dialog...', { regionId, error });
        
        await handleVersionConflict(
          regionId,
          changes,
          primaryField,
          currentVersion,
          store,
          // onAcceptRemote
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          async (remoteRegion: any) => {
            this.applyRemoteChangesToStore(remoteRegion as Partial<RegionData & LazyRegion>, store);
            // Update version to match remote version
            if (remoteRegion._version) {
              store.setRegionVersion(regionId, remoteRegion._version);
            }
            // End bounds pending edit if this was a bounds operation
            if (changes.start !== undefined || changes.end !== undefined) {
              services.storeService.endPendingEdit(regionId, 'bounds');
            }
          },
          // onKeepLocal  
          async (latestVersion: number) => {
            // Re-apply local changes and force save with latest version
            this.applyChangesToStore(changes, existingRegion, store);
            
            await services.regionService.updateRegion(
              regionId,
              updateData,
              user.username,
              latestVersion
            );
            
            // Update version tracking
            store.setRegionVersion(regionId, latestVersion + 1);
            
            // Update transcription metadata
            const updateTranscriptionUseCase = new UpdateTranscriptionUseCase({
              transcriptionId: existingRegion.transcriptionId,
              services,
              store: store,
            });
            await updateTranscriptionUseCase.execute();
          }
        );
      } else {
        // Not a version conflict, throw the error
        throw error;
      }
    }
  }

  private revertChangesToStore(changes: RegionChanges, originalRegion: RegionData, store: typeof services.storeService): void {
    // Revert each changed field to its original value
    Object.keys(changes).forEach(field => {
      const originalValue = (originalRegion as unknown as Record<string, unknown>)[field];
      
      switch (field) {
        case 'regionText':
          store.setRegionText(originalRegion.id, originalValue as string);
          break;
        case 'translation':
          store.setRegionTranslation(originalRegion.id, originalValue as string);
          break;
        case 'start':
        case 'end':
          store.updateRegionBounds(originalRegion.id, originalRegion.start, originalRegion.end);
          break;
        case 'regionAnalysis':
          store.setRegionAnalysis(originalRegion.id, originalValue as WordAnalysis[]);
          break;
      }
    });
  }

  private applyRemoteChangesToStore(remoteRegion: Partial<RegionData & LazyRegion>, store: typeof services.storeService): void {
    if (!remoteRegion.id) return;
    
    // Apply each field from the remote region
    if (remoteRegion.regionText !== undefined) {
      store.setRegionText(remoteRegion.id, remoteRegion.regionText);
    }
    if (remoteRegion.translation !== undefined) {
      store.setRegionTranslation(remoteRegion.id, remoteRegion.translation);
    }
    if (remoteRegion.start !== undefined && remoteRegion.end !== undefined) {
      store.updateRegionBounds(remoteRegion.id, remoteRegion.start, remoteRegion.end);
    }
    if (remoteRegion.regionAnalysis !== undefined) {
      store.setRegionAnalysis(remoteRegion.id, remoteRegion.regionAnalysis as WordAnalysis[]);
    }
  }
}
