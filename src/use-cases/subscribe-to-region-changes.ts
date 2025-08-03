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
    
    // DEBUG: Track all subscription events to debug parallel editing issues

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

        // GRANULAR APPROACH: Check for field-specific pending edits
        // Allow parallel editing of different fields (text + translation, text + bounds, etc.)
        const isEditingText = store.isPendingEdit(region.id, 'regionText');
        const isEditingTranslation = store.isPendingEdit(region.id, 'translation');
        
        if (isEditingText || isEditingTranslation) {
          // Apply selective protection: only protect fields being actively edited
          this.applyRemoteChangesWithSelectiveProtection(currentRegion, region, {
            protectText: isEditingText,
            protectTranslation: isEditingTranslation
          });
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
   * Apply remote changes with selective field protection
   * Allows parallel editing of different fields (text + translation, text + bounds, etc.)
   */
  private applyRemoteChangesWithSelectiveProtection(
    currentRegion: any, 
    updatedRegion: any, 
    protection: { protectText: boolean; protectTranslation: boolean }
  ): void {
    const store = this.config.services.storeService;
    const wavesurferService = this.config.services.wavesurferService;
    const rteService = this.config.services.rteService;
    
    // Always update bounds (safe to update during any type of editing)
    if (updatedRegion.start !== undefined && updatedRegion.end !== undefined) {
      const boundsChanged = currentRegion.start !== updatedRegion.start || currentRegion.end !== updatedRegion.end;
      if (boundsChanged) {
        store.updateRegionBounds(updatedRegion.id, updatedRegion.start, updatedRegion.end);
        wavesurferService.setRegionPosition(updatedRegion.id, {
          start: updatedRegion.start,
          end: updatedRegion.end
        });
      }
    }
    
    // Conditionally update text (only if not being actively edited)
    if (updatedRegion.regionText !== undefined && !protection.protectText) {
      store.setRegionText(updatedRegion.id, updatedRegion.regionText);
      
      // Update RTE if it exists
      const mainEditorKey = `${updatedRegion.id}:main` as const;
      if (rteService.hasEditor(mainEditorKey)) {
        console.log('🔌 Updating RTE with remote text change (translation being edited)');
        rteService.setContent(mainEditorKey, updatedRegion.regionText);
        
        // Reapply known words formatting after content update
        // Use updated analysis if provided, otherwise fall back to current analysis
        const regionAnalysis = updatedRegion.regionAnalysis || store.regionById(updatedRegion.id)?.regionAnalysis;
        if (regionAnalysis && regionAnalysis.length > 0) {
          rteService.applyKnownWordsFormatting(mainEditorKey, regionAnalysis);
        }
      }
    }
    
    // Conditionally update translation (only if not being actively edited)
    if (updatedRegion.translation !== undefined && !protection.protectTranslation) {
      store.setRegionTranslation(updatedRegion.id, updatedRegion.translation);
      
      // Update translation RTE if it exists
      const translationEditorKey = `${updatedRegion.id}:translation` as const;
      if (rteService.hasEditor(translationEditorKey)) {
        console.log('🔌 Updating RTE with remote translation change (text being edited)');
        rteService.setContent(translationEditorKey, updatedRegion.translation);
        
        // Reapply known words formatting after content update
        // Use updated analysis if provided, otherwise fall back to current analysis
        const regionAnalysis = updatedRegion.regionAnalysis || store.regionById(updatedRegion.id)?.regionAnalysis;
        if (regionAnalysis && regionAnalysis.length > 0) {
          rteService.applyKnownWordsFormatting(translationEditorKey, regionAnalysis);
        }
      }
    }
    
    // Update region analysis (always unprotected)
    if (updatedRegion.regionAnalysis !== undefined) {
      store.setRegionAnalysis(updatedRegion.id, updatedRegion.regionAnalysis);
      store.addKnownWords(updatedRegion.regionAnalysis);
    }
    
    // Update version tracking - only block if ALL remote updates are for protected fields
    // This ensures conflicts are detected when same field is edited, but allows parallel saves for different fields
    const storedRegion = store.regionById(updatedRegion.id);
    
    // For version update decisions, only block if ALL changes are to protected fields
    // Don't try to detect "what actually changed" since local store has unsaved edits
    // Simple rule: if there are unprotected changes (bounds/analysis), allow version update
    const hasProtectedTextChange = false; // Don't block based on text comparison
    const hasProtectedTranslationChange = false; // Don't block based on translation comparison
    
        // BRILLIANT USER INSIGHT: Compare subscription vs BASELINE (before edits), not current store
    // This tells us exactly what the OTHER browser changed
    
    // Get baseline from pending edits (original state when edit started)
    const baseline = store.getBaselineForRegion(updatedRegion.id);
    
    // Compare subscription to baseline to see what ACTUALLY changed
    const actualChanges = {
      bounds: (updatedRegion.start !== undefined && baseline?.start !== updatedRegion.start) || 
              (updatedRegion.end !== undefined && baseline?.end !== updatedRegion.end),
      text: updatedRegion.regionText !== undefined && baseline?.regionText !== updatedRegion.regionText,
      translation: updatedRegion.translation !== undefined && baseline?.translation !== updatedRegion.translation,
      analysis: updatedRegion.regionAnalysis !== undefined && 
                JSON.stringify(baseline?.regionAnalysis) !== JSON.stringify(updatedRegion.regionAnalysis)
    };

    // Determine if there are unprotected changes (what we should allow)
    const hasUnprotectedChanges = 
      actualChanges.bounds ||                                    // Bounds always unprotected
      (actualChanges.analysis && !actualChanges.text && !actualChanges.translation) || // Analysis ONLY when standalone (not side effect)
      (!protection.protectText && actualChanges.text) ||        // Text when not editing text
      (!protection.protectTranslation && actualChanges.translation); // Translation when not editing translation


    
    // Simple rule: Always update version UNLESS user is editing and NO unprotected changes
    // This ensures conflicts only when same field edited, parallel saves for different fields
    const shouldBlockVersion = (protection.protectText || protection.protectTranslation) && !hasUnprotectedChanges;
    
    if (updatedRegion._version !== undefined && !shouldBlockVersion) {
      store.setRegionVersion(updatedRegion.id, updatedRegion._version);
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

    // Update region analysis (safe to update during any editing)
    if (updatedRegion.regionAnalysis !== undefined) {
      store.setRegionAnalysis(updatedRegion.id, updatedRegion.regionAnalysis);
      if (updatedRegion.regionAnalysis.length > 0) {
        store.addKnownWords(updatedRegion.regionAnalysis);
      }
    }
    
    // Always update version in the old protection method
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
        
        // Reapply known words formatting after content update
        // Use updated analysis if provided, otherwise fall back to current analysis
        const regionAnalysis = updatedRegion.regionAnalysis || store.regionById(updatedRegion.id)?.regionAnalysis;
        if (regionAnalysis && regionAnalysis.length > 0) {
          rteService.applyKnownWordsFormatting(mainEditorKey, regionAnalysis);
        }
      }
    }
    if (updatedRegion.translation !== undefined) {
      store.setRegionTranslation(updatedRegion.id, updatedRegion.translation);
      
      // Update translation RTE if it exists for this region
      const translationEditorKey = `${updatedRegion.id}:translation` as const;
      if (rteService.hasEditor(translationEditorKey)) {
        console.log('🔌 Updating RTE with remote translation change');
        rteService.setContent(translationEditorKey, updatedRegion.translation);
        
        // Reapply known words formatting after content update
        // Use updated analysis if provided, otherwise fall back to current analysis
        const regionAnalysis = updatedRegion.regionAnalysis || store.regionById(updatedRegion.id)?.regionAnalysis;
        if (regionAnalysis && regionAnalysis.length > 0) {
          rteService.applyKnownWordsFormatting(translationEditorKey, regionAnalysis);
        }
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
    
    // Update region analysis
    if (updatedRegion.regionAnalysis !== undefined) {
      store.setRegionAnalysis(updatedRegion.id, updatedRegion.regionAnalysis);
      if (updatedRegion.regionAnalysis.length > 0) {
        store.addKnownWords(updatedRegion.regionAnalysis);
      }
    }
    
    // Update version tracking
    if (updatedRegion._version !== undefined) {
      store.setRegionVersion(updatedRegion.id, updatedRegion._version);
    }
  }

  // Note: Removed complex conflict prediction methods - we now use simple version-based conflicts
} 