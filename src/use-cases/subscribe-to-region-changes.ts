import { services } from '../services';
import type { RegionSubscriptionEvent } from '../services/regionService';

export interface SubscribeToRegionChangesConfig {
  transcriptionId: string;
  services: typeof services;
}

export class SubscribeToRegionChangesUseCase {
  constructor(private config: SubscribeToRegionChangesConfig) {}

  validate(): void {
    if (!this.config.transcriptionId || !this.config.transcriptionId.trim()) {
      throw new Error('transcriptionId is required');
    }
  }

  execute(): (() => void) | undefined {
    this.validate();

    // Set up the subscription with a callback that processes the events
    const unsubscribe = this.config.services.regionService.subscribeToRegionChanges(
      this.config.transcriptionId,
      (event) => {
        this.handleRegionSubscriptionEvent(event);
      }
    );

    return unsubscribe;
  }

  handleRegionSubscriptionEvent(event: RegionSubscriptionEvent): void {
    const { mutation, region } = event;
    const store = this.config.services.storeService;
    const wavesurferService = this.config.services.wavesurferService;
    const flashService = this.config.services.flashIndicatorService;
    
    // Check if this is a self-triggered event
    const currentUser = this.config.services.userService.currentUser();
    const isSelfTriggered = currentUser && region.userLastUpdated === currentUser.username;
    
    if (isSelfTriggered) {
      // For self-triggered events, only update version tracking
      store.setRegionVersion(region.id, region._version!);
      return;
    }

    // Trigger flash indicator for all remote changes
    if (region.userLastUpdated) {
      flashService.flashRegion(region.id, region.userLastUpdated);
    }

    switch (mutation) {
      case 'CREATE':
        // Update store
        store.addNewRegion(region);
        // Note: addNewRegion already handles version tracking for the new region
        
        // Update wavesurfer - add new region to the waveform
        wavesurferService.addRegionWithId({
          id: region.id,
          start: region.start,
          end: region.end
        });
        break;

      case 'DELETE':
        // Update store
        store.deleteRegion(region.id);
        // Update wavesurfer
        wavesurferService.deleteRegion(region.id);
        break;

      case 'UPDATE': {

        const currentRegion = store.regionById(region.id);
        
        if (!currentRegion) {
          console.warn('🔌 Received UPDATE for unknown region:', region.id);
          return;
        }

                // HYBRID APPROACH: Protect active typing AND preserve version for conflict detection
        // Check if user is actively typing (has pending edits)
        const isActivelyTyping = store.isPendingEdit(region.id);
        

        
        if (isActivelyTyping) {
          // Apply bounds/analysis changes but DON'T update version or text
          // This preserves the stale version for conflict detection at save time
          this.applyRemoteChangesButProtectTyping(currentRegion, region);
        } else {
          // User not actively typing, apply everything including version tracking
          this.applyRemoteChanges(currentRegion, region);
          store.setRegionVersion(region.id, region._version!);
        }
        break;
      }

      default:
        console.warn('🔌 Unknown mutation type:', mutation);
    }
  }

  /**
   * Apply remote changes while protecting user's active typing
   * Updates bounds, analysis, but NOT text content or version
   */
  private applyRemoteChangesButProtectTyping(currentRegion: any, updatedRegion: any): void {
    const store = this.config.services.storeService;
    const wavesurferService = this.config.services.wavesurferService;
    
    // Check if start/end times changed (bounds update)
    const boundsChanged = currentRegion.start !== updatedRegion.start || currentRegion.end !== updatedRegion.end;
    
    if (boundsChanged) {
      // Update store bounds
      store.updateRegionBounds(updatedRegion.id, updatedRegion.start, updatedRegion.end);
      
      // Update wavesurfer region bounds
      wavesurferService.setRegionPosition(updatedRegion.id, {
        start: updatedRegion.start,
        end: updatedRegion.end
      });
    }

    // Update version tracking (allows both text and bounds changes to save without conflict)
    if (updatedRegion._version !== undefined) {
      store.setRegionVersion(updatedRegion.id, updatedRegion._version);
    }

    console.log('🔌 Protected text content but updated bounds/version - allows parallel saves');
  }

  private applyRemoteChanges(currentRegion: any, updatedRegion: any): void {
    const store = this.config.services.storeService;
    const wavesurferService = this.config.services.wavesurferService;
    const rteService = this.config.services.rteService;
    
    // Update all region data in store
    if (updatedRegion.regionText !== undefined) {
      store.setRegionText(updatedRegion.id, updatedRegion.regionText);
      
      // Update RTE if it exists for this region
      const mainEditorKey = `${updatedRegion.id}:main` as const;
      if (rteService.hasEditor(mainEditorKey)) {
        console.log('🔌 Updating RTE with remote text change');
        rteService.setContent(mainEditorKey, updatedRegion.regionText);
      }
    }
    if (updatedRegion.translation !== undefined) {
      store.setRegionTranslation(updatedRegion.id, updatedRegion.translation);
      
      // Update translation RTE if it exists for this region
      const translationEditorKey = `${updatedRegion.id}:translation` as const;
      if (rteService.hasEditor(translationEditorKey)) {
        console.log('🔌 Updating RTE with remote translation change');
        rteService.setContent(translationEditorKey, updatedRegion.translation);
      }
    }
    if (updatedRegion.start !== undefined && updatedRegion.end !== undefined) {
      store.updateRegionBounds(updatedRegion.id, updatedRegion.start, updatedRegion.end);
      // Update wavesurfer region bounds
      wavesurferService.setRegionPosition(updatedRegion.id, {
        start: updatedRegion.start,
        end: updatedRegion.end
      });
    }
    
    // Update version tracking
    if (updatedRegion._version !== undefined) {
      store.setRegionVersion(updatedRegion.id, updatedRegion._version);
    }
  }

  // Note: Removed complex conflict prediction methods - we now use simple version-based conflicts
} 