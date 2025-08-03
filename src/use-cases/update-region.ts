import { services } from '../services';
import { UpdateTranscriptionUseCase } from './update-transcription';
import { isVersionConflictError, handleVersionConflict } from '../services/versionConflictService';
import type { RegionData } from '../services/adt';
import type { LazyRegion } from '../models';
import Timeout from 'smart-timeout';

// Type for changes that can be made to a region
type RegionChanges = {
  regionText?: string;
  translation?: string;
  start?: number;
  end?: number;
  regionAnalysis?: string[];
};

interface UpdateRegionConfig {
  regionId: string;
  changes: RegionChanges; // e.g., { regionText: "new text" } or { start: 10, end: 20 }
  debounceMs: number; // 3000 for text, 2500 for bounds
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
        default:
          console.warn(`Unknown field type for store update: ${field}`);
      }
    });
  }

  private async performSave(existingRegion: RegionData, user: { username: string }): Promise<void> {
    const { regionId, changes, primaryField, services, store } = this.config;
    
    // Prepare update data
    const updateData = { ...changes };
    
    // If updating main text, include current analysis from store at save time
    if (changes.regionText !== undefined) {
      try {
        const region = store.regionById(regionId);
        if (region?.regionAnalysis) {
          updateData.regionAnalysis = region.regionAnalysis;
        }
      } catch (error) {
        console.warn('Could not get analysis from store at save time:', error);
      }
    }

    // Get current version for optimistic concurrency control
    const currentVersion = store.getRegionVersion(regionId);

    try {
      // Save to database
      await services.regionService.updateRegion(
        regionId,
        updateData,
        user.username,
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
          async (remoteRegion: Partial<RegionData & LazyRegion>) => {
            this.applyRemoteChangesToStore(remoteRegion, store, services);
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
          }
        );
      } else {
        throw error; // Re-throw non-conflict errors
      }
    }
  }

  private revertChangesToStore(changes: RegionChanges, existingRegion: RegionData, store: typeof services.storeService): void {
    // Revert optimistic updates
    Object.keys(changes).forEach(field => {
      const originalValue = (existingRegion as unknown as Record<string, unknown>)[field];
      
      switch (field) {
        case 'regionText':
          store.setRegionText(existingRegion.id, originalValue as string);
          break;
        case 'translation':
          store.setRegionTranslation(existingRegion.id, originalValue as string);
          break;
        case 'start':
        case 'end':
          store.updateRegionBounds(existingRegion.id, existingRegion.start, existingRegion.end);
          break;
      }
    });
  }

  private applyRemoteChangesToStore(remoteRegion: Partial<RegionData & LazyRegion>, store: typeof services.storeService, servicesArg: typeof services): void {
    const { regionId } = this.config;
    
    // Apply all remote changes to store
    if (remoteRegion.regionText !== undefined) {
      store.setRegionText(regionId, remoteRegion.regionText);
      
      // Update RTE editor if exists
      const editorKey = `${regionId}:main` as const;
      if (servicesArg.rteService.hasEditor(editorKey)) {
        console.log('🔄 Updating RTE editor with remote content');
        servicesArg.rteService.setContent(editorKey, remoteRegion.regionText);
      }
    }
    
    if (remoteRegion.translation !== undefined) {
      store.setRegionTranslation(regionId, remoteRegion.translation);
      
      // Update translation RTE if exists
      const translationEditorKey = `${regionId}:translation` as const;
      if (servicesArg.rteService.hasEditor(translationEditorKey)) {
        servicesArg.rteService.setContent(translationEditorKey, remoteRegion.translation);
      }
    }
    
    if (remoteRegion.start !== undefined && remoteRegion.end !== undefined) {
      store.updateRegionBounds(regionId, remoteRegion.start, remoteRegion.end);
      
      // Update wavesurfer position
      servicesArg.wavesurferService.setRegionPosition(regionId, {
        start: remoteRegion.start,
        end: remoteRegion.end
      });
    }
  }
} 