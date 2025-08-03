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

                // HYBRID APPROACH: Protect active typing AND preserve version for conflict detection
        // Check if user is actively typing (has pending edits)
        const isActivelyTyping = store.isPendingEdit(region.id);
        
        if (isActivelyTyping) {
          console.log('🔌 User actively typing - updating bounds/analysis but preserving version and text:', region.id);
          // Apply bounds/analysis changes but DON'T update version or text
          // This preserves the stale version for conflict detection at save time
          this.applyRemoteChangesButProtectTyping(currentRegion, region);
        } else {
          console.log('🔌 User not typing - applying all remote changes including version:', region.id);
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
  
    // Update regionAnalysis if it exists (safe to update - doesn't affect typing)
    if (updatedRegion.regionAnalysis && updatedRegion.regionAnalysis.length > 0) {
      store.setRegionAnalysis(updatedRegion.id, updatedRegion.regionAnalysis);
      // Only add to global knownWords if this region's analysis changed
      if (!currentRegion.regionAnalysis || currentRegion.regionAnalysis.length !== updatedRegion.regionAnalysis.length) {
        store.addKnownWords(updatedRegion.regionAnalysis);
      }
      
      // Apply formatting to RTE if it exists (visual formatting only, not content)
      const mainEditorKey = `${updatedRegion.id}:main` as const;
      if (this.config.services.rteService.hasEditor(mainEditorKey)) {
        this.config.services.rteService.applyKnownWordsFormatting(mainEditorKey, updatedRegion.regionAnalysis);
      }
    }
    
    // IMPORTANT: DO NOT update regionText, translation, or version here - preserve for conflict detection
    console.log('🔌 Protected text content and version from remote changes while user typing');
  }

  private applyRemoteChanges(currentRegion: any, updatedRegion: any): void {
    const store = this.config.services.storeService;
    const wavesurferService = this.config.services.wavesurferService;
    
    // Check if start/end times changed (bounds update)
    const boundsChanged = currentRegion.start !== updatedRegion.start || currentRegion.end !== updatedRegion.end;
    
    if (boundsChanged) {
      // Update store bounds
      store.updateRegionBounds(updatedRegion.id, updatedRegion.start, updatedRegion.end);
      
      // Update wavesurfer region bounds using the new method
      wavesurferService.setRegionPosition(updatedRegion.id, {
        start: updatedRegion.start,
        end: updatedRegion.end
      });
    }

    // Check if text changed
    if (currentRegion.regionText !== updatedRegion.regionText) {
      store.setRegionText(updatedRegion.id, updatedRegion.regionText || '');
      
      // Update RTE silently if it exists (won't trigger save)
      const mainEditorKey = `${updatedRegion.id}:main` as const;
      if (this.config.services.rteService.hasEditor(mainEditorKey)) {
        this.config.services.rteService.setContent(mainEditorKey, updatedRegion.regionText || '');
      }
    }

    // Check if translation changed
    if (currentRegion.translation !== updatedRegion.translation) {
      store.setRegionTranslation(updatedRegion.id, updatedRegion.translation || '');
    }

    // Set regionAnalysis if it exists (do this last to avoid duplicates)
    if (updatedRegion.regionAnalysis && updatedRegion.regionAnalysis.length > 0) {
      store.setRegionAnalysis(updatedRegion.id, updatedRegion.regionAnalysis);
      // Only add to global knownWords if this region's analysis changed
      if (!currentRegion.regionAnalysis || currentRegion.regionAnalysis.length !== updatedRegion.regionAnalysis.length) {
        store.addKnownWords(updatedRegion.regionAnalysis);
      }
      
      // Apply formatting to RTE if it exists
      const mainEditorKey = `${updatedRegion.id}:main` as const;
      if (this.config.services.rteService.hasEditor(mainEditorKey)) {
        this.config.services.rteService.applyKnownWordsFormatting(mainEditorKey, updatedRegion.regionAnalysis);
      }
    }
  }

  // Note: Removed complex conflict prediction methods - we now use simple version-based conflicts
} 