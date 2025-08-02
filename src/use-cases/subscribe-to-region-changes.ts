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

    console.log('🔌 Starting subscription for transcriptionId:', this.config.transcriptionId);

    // Set up the subscription with a callback that processes the events
    const unsubscribe = this.config.services.regionService.subscribeToRegionChanges(
      this.config.transcriptionId,
      (event) => {
        console.log('🔌 Region subscription event:', {
          mutation: event.mutation,
          region: event.region
        });
        
        this.handleRegionSubscriptionEvent(event);
      }
    );

    return unsubscribe;
  }

  private handleRegionSubscriptionEvent(event: RegionSubscriptionEvent): void {
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

    // TODO: Version conflict detection
    // If incoming region._version < current store region._version + 1, 
    // we may have a sync issue that needs conflict resolution

    switch (mutation) {
      case 'CREATE':
        console.log('🔌 Handling CREATE for region:', region.id);
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
        console.log('🔌 Handling DELETE for region:', region.id);
        // Update store
        store.deleteRegion(region.id);
        // Update wavesurfer
        wavesurferService.deleteRegion(region.id);
        break;

      case 'UPDATE': {
        console.log('🔌 Handling UPDATE for region:', region.id);
        const currentRegion = store.regionById(region.id);
        
        if (!currentRegion) {
          console.warn('🔌 Received UPDATE for unknown region:', region.id);
          return;
        }

        // Update version tracking for this remote change (region has new version from DB)
        store.setRegionVersion(region.id, region._version!);

        // Check if start/end times changed (bounds update)
        const boundsChanged = currentRegion.start !== region.start || currentRegion.end !== region.end;
        
        if (boundsChanged) {
          // Update store bounds
          store.updateRegionBounds(region.id, region.start, region.end);
          
          // Update wavesurfer region bounds using the new method
          wavesurferService.setRegionPosition(region.id, {
            start: region.start,
            end: region.end
          });
        }

        // Check if text changed
        if (currentRegion.regionText !== region.regionText) {
          store.setRegionText(region.id, region.regionText || '');
          
          // Update RTE silently if it exists (won't trigger save)
          const mainEditorKey = `${region.id}:main` as const;
          if (this.config.services.rteService.hasEditor(mainEditorKey)) {
            this.config.services.rteService.setContent(mainEditorKey, region.regionText || '');
          }
        }

        // Check if translation changed
        if (currentRegion.translation !== region.translation) {
          store.setRegionTranslation(region.id, region.translation || '');
        }

        // Set regionAnalysis if it exists (do this last to avoid duplicates)
        if (region.regionAnalysis && region.regionAnalysis.length > 0) {
          store.setRegionAnalysis(region.id, region.regionAnalysis);
          // Only add to global knownWords if this region's analysis changed
          if (!currentRegion.regionAnalysis || currentRegion.regionAnalysis.length !== region.regionAnalysis.length) {
            store.addKnownWords(region.regionAnalysis);
          }
          
          // Apply formatting to RTE if it exists
          const mainEditorKey = `${region.id}:main` as const;
          if (this.config.services.rteService.hasEditor(mainEditorKey)) {
            this.config.services.rteService.applyKnownWordsFormatting(mainEditorKey, region.regionAnalysis);
          }
        }
        break;
      }

      default:
        console.warn('🔌 Unknown mutation type:', mutation);
    }
  }
} 