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
    
    // Ignore events that we triggered ourselves
    const currentUser = this.config.services.userService.currentUser();
    if (currentUser && region.userLastUpdated === currentUser.username) {
      console.log('🔌 Ignoring self-triggered event for region:', region.id);
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

        // Check if start/end times changed (bounds update)
        const boundsChanged = currentRegion.start !== region.start || currentRegion.end !== region.end;
        
        if (boundsChanged) {
          console.log('🔌 Region bounds changed, updating wavesurfer');
          // Update store bounds
          store.updateRegionBounds(region.id, region.start, region.end);
          
          // Update wavesurfer region bounds using the new method
          wavesurferService.setRegionPosition(region.id, {
            start: region.start,
            end: region.end
          });
        }

        // Set regionAnalysis FIRST if it exists (ensures proper highlighting when text updates)
        if (region.regionAnalysis && region.regionAnalysis.length > 0) {
          console.log('🔌 Setting region analysis with', region.regionAnalysis.length, 'words');
          store.setRegionAnalysis(region.id, region.regionAnalysis);
          // Add new words to global knownWords for highlighting
          store.addKnownWords(region.regionAnalysis);
          console.log('🔌 Added analysis words to global knownWords:', region.regionAnalysis.length);
        }

        // Check if text changed
        if (currentRegion.regionText !== region.regionText) {
          console.log('🔌 Region text changed, updating store');
          store.setRegionText(region.id, region.regionText || '');
          
          // Update RTE silently if it exists (won't trigger save)
          const mainEditorKey = `${region.id}:main` as const;
          if (this.config.services.rteService.hasEditor(mainEditorKey)) {
            console.log('🔌 Updating RTE for region:', region.id);
            this.config.services.rteService.setContent(mainEditorKey, region.regionText || '');
            
            // Use the region's analysis words directly since store.addKnownWords isn't working
            const regionAnalysisWords = region.regionAnalysis && Array.isArray(region.regionAnalysis) 
              ? region.regionAnalysis as string[]
              : [];
            console.log('🔌 Applying formatting with region analysis words:', regionAnalysisWords.length, regionAnalysisWords.slice(0, 5));
            this.config.services.rteService.applyKnownWordsFormatting(mainEditorKey, regionAnalysisWords);
          }
        }

        // Check if translation changed
        if (currentRegion.translation !== region.translation) {
          console.log('🔌 Region translation changed, updating store');
          store.setRegionTranslation(region.id, region.translation || '');
        }
        break;
      }

      default:
        console.warn('🔌 Unknown mutation type:', mutation);
    }
  }
} 