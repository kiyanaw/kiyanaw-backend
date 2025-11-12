import { services } from '../services';
import type { RegionSubscriptionEvent } from '../services/regionService';
import { issueHighlightService } from '../services/issueHighlightService';
import { extractWords } from '../services/migrationService';

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

    const unsubscribe = this.config.services.regionService.subscribeToRegionChanges(
              this.config.transcriptionId,
        async (event) => {
          await this.handleRegionSubscriptionEvent(event);
        }
    );

    return unsubscribe;
  }

  async handleRegionSubscriptionEvent(event: RegionSubscriptionEvent): Promise<void> {
    const { mutation, region } = event;
    
    const store = this.config.services.storeService;
    const wavesurferService = this.config.services.wavesurferService;
    const flashService = this.config.services.flashIndicatorService;
    
    // Check if this is a self-triggered event
    const currentUser = this.config.services.userService.currentUser();
    const isSelfTriggered = currentUser && region.userLastUpdated === currentUser.username;
    
    if (isSelfTriggered) {
      // Skip version update for self-triggered events - we already incremented it correctly
      console.log('🔌 Self-triggered region event, skipping version update:', region.id);
      return;
    }

    // Trigger flash indicator for all remote changes
    if (region.userLastUpdated) {
      flashService.flashRegion(region.id, region.userLastUpdated);
    }

    switch (mutation) {
      case 'CREATE':
        store.addNewRegion(region);
        wavesurferService.addRegionWithId({
          id: region.id,
          start: region.start,
          end: region.end
        });
        break;

      case 'DELETE':
        store.deleteRegion(region.id);
        wavesurferService.deleteRegion(region.id);
        break;

      case 'UPDATE':
        await this.handleRegionUpdate(region);
        break;

      default:
        console.warn('🔌 Unknown mutation type:', mutation);
    }
  }

  /**
   * Handle remote region updates with intelligent conflict avoidance.
   * 
   * This method is the decision engine for applying remote updates to regions.
   * It determines whether to use selective protection (for parallel editing) or
   * apply all changes directly based on current user activity.
   * 
   * Decision Flow:
   * ┌─────────────────────────────────────────────────────────────────────────────┐
   * │                           Remote UPDATE received                            │
   * │                                    │                                        │
   * │                                    ▼                                        │
   * │                        Does region exist locally?                           │
   * │                               │           │                                 │
   * │                          NO   │           │  YES                            │
   * │                               ▼           ▼                                 │
   * │                        Log warning    Check for active                      │
   * │                        & return       editing sessions                      │
   * │                                            │                                │
   * │                                            ▼                                │
   * │                               Any fields being edited?                      │
   * │                                  │                │                         │
   * │                             NO   │                │  YES                    │
   * │                                  ▼                ▼                         │
   * │                         Apply all changes   Use selective                   │
   * │                         + update version    protection                      │
   * │                                             (parallel editing)              │
   * └─────────────────────────────────────────────────────────────────────────────┘
   * 
   * @param updatedRegion The remote region update from the subscription
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleRegionUpdate(updatedRegion: any): Promise<void> {
    const store = this.config.services.storeService;
    const currentRegion = store.regionById(updatedRegion.id);
    
    if (!currentRegion) {
      console.warn('🔌 Received UPDATE for unknown region:', updatedRegion.id);
      return;
    }

    // Check if there are active conflicts for this region that need updating
    await this.updateActiveConflictsIfNeeded(currentRegion, updatedRegion);

    // Check for field-specific pending edits to allow parallel editing
    const isEditingText = store.isPendingEdit(updatedRegion.id, 'regionText');
    const isEditingTranslation = store.isPendingEdit(updatedRegion.id, 'translation');
    const isEditingBounds = store.isPendingEdit(updatedRegion.id, 'bounds');
    
    if (isEditingText || isEditingTranslation || isEditingBounds) {
      this.applyRemoteChangesWithSelectiveProtection(currentRegion, updatedRegion, {
        protectText: isEditingText,
        protectTranslation: isEditingTranslation,
        protectBounds: isEditingBounds
      });
    } else {
      this.applyRemoteChanges(updatedRegion);
      store.setRegionVersion(updatedRegion.id, updatedRegion._version!);
    }
  }

  /**
   * Apply remote changes with selective field protection for parallel editing.
   * 
   * This method enables real-time collaboration where multiple users can edit different
   * fields of the same region simultaneously without conflicts. It protects fields that
   * are currently being edited while allowing updates to unprotected fields.
   * 
   * Use Cases:
   * ┌─────────────────────────────────────────────────────────────────────────────┐
   * │ Scenario 1: User A edits text, User B edits translation                     │
   * │ ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                       │
   * │ │ User A      │    │ Remote      │    │ User A      │                       │
   * │ │ typing...   │───▶│ saves       │───▶│ sees trans  │                       │
   * │ │ [text]      │    │ translation │    │ update      │                       │
   * │ │             │    │             │    │ [text protected]                    │
   * │ └─────────────┘    └─────────────┘    └─────────────┘                       │
   * │ Result: Translation updates, text editing continues uninterrupted           │
   * └─────────────────────────────────────────────────────────────────────────────┘
   * 
   * ┌─────────────────────────────────────────────────────────────────────────────┐
   * │ Scenario 2: User A edits bounds, User B edits text                          │
   * │ ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                       │
   * │ │ User A      │    │ Remote      │    │ User A      │                       │
   * │ │ dragging    │───▶│ saves       │───▶│ sees text   │                       │
   * │ │ [bounds]    │    │ text change │    │ update      │                       │
   * │ │             │    │             │    │ [bounds protected]                  │
   * │ └─────────────┘    └─────────────┘    └─────────────┘                       │
   * │ Result: Text updates, bounds editing continues uninterrupted                │
   * └─────────────────────────────────────────────────────────────────────────────┘
   * 
   * Key Logic:
   * 1. PROTECTION: Fields being actively edited are protected from remote updates
   * 2. BASELINE COMPARISON: Compares remote changes against the original state
   *    (before any local edits) to determine what the other user actually changed
   * 3. VERSION TRACKING: Only updates version if there are unprotected changes,
   *    ensuring conflicts are only detected when the same field is edited
   * 
   * Example Flow:
   * - Baseline: { text: "hello", translation: "hola", version: 5 }
   * - User A starts editing text (protectText = true)
   * - User B saves translation: "bonjour"
   * - Remote update: { text: "hello", translation: "bonjour", version: 6 }
   * - Comparison: translation changed (hello→bonjour), text unchanged
   * - Result: Update translation, protect text, update version to 6
   * 
   * @param currentRegion Current region state in the store
   * @param updatedRegion Remote region update from subscription
   * @param protection Which fields to protect from updates
   */
  private applyRemoteChangesWithSelectiveProtection(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentRegion: any, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updatedRegion: any, 
    protection: { protectText: boolean; protectTranslation: boolean; protectBounds?: boolean }
  ): void {
    const store = this.config.services.storeService;
    const wavesurferService = this.config.services.wavesurferService;
    
    // Helper function to normalize null/undefined/empty string values for comparison
    const normalizeEmptyValue = (value: string | number | boolean | string[] | null | undefined): string => {
      if (value === null || value === undefined || value === '') {
        return '';
      }
      return String(value);
    };

    // Calculate what actually changed using baseline comparison
    const baseline = store.getBaselineForRegion(updatedRegion.id);
    const hasAnyPendingEdits = protection.protectText || protection.protectTranslation || protection.protectBounds;
    
    const actualChanges = {
      bounds: hasAnyPendingEdits && baseline ? (
        (updatedRegion.start !== undefined && baseline.start !== updatedRegion.start) || 
        (updatedRegion.end !== undefined && baseline.end !== updatedRegion.end)
      ) : (updatedRegion.start !== undefined || updatedRegion.end !== undefined),
      
      text: hasAnyPendingEdits && baseline ? 
        (updatedRegion.regionText !== undefined && normalizeEmptyValue(baseline.regionText) !== normalizeEmptyValue(updatedRegion.regionText)) :
        (updatedRegion.regionText !== undefined),
        
      translation: hasAnyPendingEdits && baseline ?
        (updatedRegion.translation !== undefined && normalizeEmptyValue(baseline.translation) !== normalizeEmptyValue(updatedRegion.translation)) :
        (updatedRegion.translation !== undefined),
        
      analysis: hasAnyPendingEdits && baseline ?
        (updatedRegion.regionAnalysis !== undefined && JSON.stringify(baseline.regionAnalysis) !== JSON.stringify(updatedRegion.regionAnalysis)) :
        (updatedRegion.regionAnalysis !== undefined)
    };
    
    // Update bounds if not being actively edited
    if (updatedRegion.start !== undefined && updatedRegion.end !== undefined && !protection.protectBounds) {
      const boundsChanged = currentRegion.start !== updatedRegion.start || currentRegion.end !== updatedRegion.end;
      
      if (boundsChanged) {
        store.updateRegionBounds(updatedRegion.id as string, updatedRegion.start as number, updatedRegion.end as number);
        wavesurferService.setRegionPosition(updatedRegion.id as string, {
          start: updatedRegion.start as number,
          end: updatedRegion.end as number
        });
      }
    }
    
    // Update text if not being actively edited AND it actually changed
    if (updatedRegion.regionText !== undefined && !protection.protectText && actualChanges.text) {
      store.setRegionText(updatedRegion.id as string, updatedRegion.regionText as string);
      this.updateRteIfExists(`${updatedRegion.id}:main` as const, updatedRegion.regionText as string, updatedRegion);
    }
    
    // Update translation if not being actively edited AND it actually changed
    if (updatedRegion.translation !== undefined && !protection.protectTranslation && actualChanges.translation) {
      store.setRegionTranslation(updatedRegion.id as string, updatedRegion.translation as string);
      this.updateRteIfExists(`${updatedRegion.id}:translation` as const, updatedRegion.translation as string, updatedRegion);
    }
    
    // Update region analysis (always unprotected)
    if (updatedRegion.regionAnalysis !== undefined) {
      store.setRegionAnalysis(updatedRegion.id as string, updatedRegion.regionAnalysis);
      
      // If only analysis changed (not text), we need to reapply highlighting
      // This happens when Dan types and saves, and we receive the realtime update
      if (actualChanges.analysis && !actualChanges.text) {
        const mainEditorKey = `${updatedRegion.id}:main` as const;
        const rteService = this.config.services.rteService;
        
        if (rteService.hasEditor(mainEditorKey)) {
          // Parse the analysis (it comes as JSON string from GraphQL)
          const regionAnalysisRaw = updatedRegion.regionAnalysis;
          const regionAnalysis = extractWords(regionAnalysisRaw);
          
          // Get issues for the region
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const issues = (store as any).getIssuesForRegion(updatedRegion.id as string);
          const issueHighlights = issueHighlightService.convertIssuesToHighlights(issues);
          
          // Reapply highlighting with updated analysis
          rteService.applyHighlighting(mainEditorKey, {
            knownWords: regionAnalysis || [],
            issues: issueHighlights
          });
          
          console.log(`🎨 SUBSCRIBE: Applied highlighting for analysis-only update to ${updatedRegion.id}`);
        }
      }
    }

    // Determine if there are unprotected changes
    const unprotectedBounds = !protection.protectBounds && actualChanges.bounds;
    const unprotectedAnalysisOnly = actualChanges.analysis && !actualChanges.text && !actualChanges.translation;
    const unprotectedText = !protection.protectText && actualChanges.text;
    const unprotectedTranslation = !protection.protectTranslation && actualChanges.translation;
    
    const hasUnprotectedChanges = unprotectedBounds || unprotectedAnalysisOnly || unprotectedText || unprotectedTranslation;
    
    // Update version unless user is editing and there are no unprotected changes
    const shouldBlockVersion = (protection.protectText || protection.protectTranslation || protection.protectBounds) && !hasUnprotectedChanges;
    
    if (updatedRegion._version !== undefined && !shouldBlockVersion) {
      store.setRegionVersion(updatedRegion.id, updatedRegion._version);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyRemoteChanges(updatedRegion: any): void {
    const store = this.config.services.storeService;
    const wavesurferService = this.config.services.wavesurferService;
    
    if (updatedRegion.regionText !== undefined) {
      store.setRegionText(updatedRegion.id, updatedRegion.regionText);
      this.updateRteIfExists(`${updatedRegion.id}:main` as const, updatedRegion.regionText, updatedRegion);
    }
    
    if (updatedRegion.translation !== undefined) {
      store.setRegionTranslation(updatedRegion.id, updatedRegion.translation);
      this.updateRteIfExists(`${updatedRegion.id}:translation` as const, updatedRegion.translation, updatedRegion);
    }
    
    if (updatedRegion.start !== undefined && updatedRegion.end !== undefined) {
      store.updateRegionBounds(updatedRegion.id, updatedRegion.start, updatedRegion.end);
      wavesurferService.setRegionPosition(updatedRegion.id, {
        start: updatedRegion.start,
        end: updatedRegion.end
      });
    }
    
    if (updatedRegion.regionAnalysis !== undefined) {
      store.setRegionAnalysis(updatedRegion.id, updatedRegion.regionAnalysis);
    }
    
    if (updatedRegion._version !== undefined) {
      store.setRegionVersion(updatedRegion.id, updatedRegion._version);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private updateRteIfExists(editorKey: `${string}:main` | `${string}:translation`, content: string, updatedRegion: any): void {
    const rteService = this.config.services.rteService;
    const store = this.config.services.storeService;
    
    if (rteService.hasEditor(editorKey)) {
      rteService.setContent(editorKey, content);
      
      // Reapply known words and issue highlighting after content update
      const regionAnalysisRaw = updatedRegion.regionAnalysis || store.regionById(updatedRegion.id as string)?.regionAnalysis;
      // Extract words for highlighting using the migration helper
      const regionAnalysis = extractWords(regionAnalysisRaw);
      // Get issues for the region
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const issues = (store as any).getIssuesForRegion(updatedRegion.id as string);
      const issueHighlights = issueHighlightService.convertIssuesToHighlights(issues);
      
      // Apply highlighting with both known words and issues
      rteService.applyHighlighting(editorKey, {
        knownWords: regionAnalysis || [],
        issues: issueHighlights
      });
    }
  }

  /**
   * Update active conflict dialogs when new remote changes arrive for the same region.
   * This ensures users see the most recent conflict state and resolve against latest data.
   * 
   * @param currentRegion The current local region data
   * @param updatedRegion The incoming remote region update
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async updateActiveConflictsIfNeeded(_currentRegion: any, updatedRegion: any): Promise<void> {
    const conflictResolutionService = this.config.services.conflictResolutionService;
    
    // Early return if conflict resolution service is not available (e.g., in tests)
    if (!conflictResolutionService) {
      return;
    }
    
    // Check if there are any active conflicts for this region
    if (!conflictResolutionService.hasActiveConflict(updatedRegion.id)) {
      return;
    }

    console.log('🔄 Active conflict detected for region, checking for updates:', updatedRegion.id);

    // Get all active conflicts for this region
    const activeConflicts = conflictResolutionService.getActiveConflictsForRegion(updatedRegion.id);
    
    for (const activeConflict of activeConflicts) {
      const field = activeConflict.field;
      if (!field) continue;

      // Check if the remote value for this field has changed
      const currentRemoteValue = activeConflict.remoteValue;
      const newRemoteValue = updatedRegion[field];

      if (currentRemoteValue !== newRemoteValue) {
        console.log('🔄 Remote value changed for active conflict:', {
          regionId: updatedRegion.id,
          field,
          oldRemote: currentRemoteValue,
          newRemote: newRemoteValue,
          newVersion: updatedRegion._version
        });

        // Create updated conflict data with new remote values
        const updatedConflictData = {
          ...activeConflict,
          remoteValue: newRemoteValue,
          remoteVersion: updatedRegion._version,
          timestamp: Date.now(),
          // Update conflictingFields if present
          conflictingFields: activeConflict.conflictingFields?.map(cf => 
            cf.field === field 
              ? { ...cf, remoteValue: newRemoteValue }
              : cf
          )
        };

        // Update the active conflict dialog
        await conflictResolutionService.updateActiveConflict(
          updatedRegion.id, 
          field, 
          updatedConflictData
        );
      }
    }
  }
} 
