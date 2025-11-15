import Timeout from 'smart-timeout';
import { services } from './index';
import { issueHighlightService } from './issueHighlightService';
import { isVersionConflictError, handleVersionConflict } from './versionConflictService';
import { UpdateTranscriptionUseCase } from '../use-cases/update-transcription';
import type { WordAnalysis } from './adt';

interface PendingChanges {
  regionText?: string;
  translation?: string;
  start?: number;
  end?: number;
  regionAnalysis?: WordAnalysis[];
}

interface SaveQueue {
  regionId: string;
  pendingChanges: PendingChanges;
  
  // Spell check coordination
  spellCheckPromise: Promise<WordAnalysis[]> | null;
  spellCheckTimer: string | null;
  
  // Save coordination
  saveTimer: string | null;
  pendingEditField?: string;
  
  // Metadata
  lastChangeTime: number;
  lastChangeSource: 'text' | 'translation' | 'bounds';
}

class RegionSaveManagerImpl {
  private queues = new Map<string, SaveQueue>();
  
  /**
   * Queue a text change with automatic spell checking
   */
  queueTextChange(regionId: string, text: string): void {
    console.log(`💾 SAVE-MANAGER: Queuing text change for ${regionId}: "${text.substring(0, 50)}..."`);
    
    const queue = this.getOrCreateQueue(regionId);
    
    // Update pending changes
    queue.pendingChanges.regionText = text;
    queue.lastChangeSource = 'text';
    queue.lastChangeTime = Date.now();
    queue.pendingEditField = 'regionText';
    
    // Cancel any existing spell check
    if (queue.spellCheckTimer) {
      Timeout.clear(queue.spellCheckTimer);
      queue.spellCheckPromise = null;
    }
    
    // Start NEW spell check (debounced 500ms)
    console.log(`⏱️ SAVE-MANAGER: Starting spell check timer (500ms) for ${regionId}`);
    const spellCheckKey = `spell-check-${regionId}`;
    queue.spellCheckTimer = spellCheckKey;
    Timeout.set(
      spellCheckKey,
      async () => {
        console.log(`🔍 SAVE-MANAGER: Spell check firing for ${regionId}`);
        queue.spellCheckPromise = this.performSpellCheck(regionId, text);
        try {
          const analysis = await queue.spellCheckPromise;
          queue.pendingChanges.regionAnalysis = analysis;
          console.log(`✅ SAVE-MANAGER: Spell check completed for ${regionId}, found ${analysis.length} known words`);
        } catch (error) {
          console.error(`❌ SAVE-MANAGER: Spell check failed for ${regionId}:`, error);
          queue.spellCheckPromise = null;
        }
      },
      500
    );
    
    // Reset save timer (debounced 3000ms from last change)
    console.log(`⏱️ SAVE-MANAGER: Starting save timer (3000ms) for ${regionId}`);
    this.resetSaveTimer(regionId, 3000);
  }
  
  /**
   * Queue a translation change (no spell checking)
   */
  queueTranslationChange(regionId: string, translation: string): void {
    console.log(`💾 SAVE-MANAGER: Queuing translation change for ${regionId}`);
    
    const queue = this.getOrCreateQueue(regionId);
    
    queue.pendingChanges.translation = translation;
    queue.lastChangeSource = 'translation';
    queue.lastChangeTime = Date.now();
    queue.pendingEditField = 'translation';
    
    this.resetSaveTimer(regionId, 3000);
  }
  
  /**
   * Queue bounds change (for Phase 2)
   */
  queueBoundsChange(regionId: string, start: number, end: number): void {
    console.log(`💾 SAVE-MANAGER: Queuing bounds change for ${regionId}`);
    
    const queue = this.getOrCreateQueue(regionId);
    
    queue.pendingChanges.start = start;
    queue.pendingChanges.end = end;
    queue.lastChangeSource = 'bounds';
    queue.lastChangeTime = Date.now();
    
    this.resetSaveTimer(regionId, 2500);
  }
  
  /**
   * Perform spell check and return analysis.
   * Delegates to spellCheckerService and updates store + RTE highlighting.
   */
  private async performSpellCheck(regionId: string, text: string): Promise<WordAnalysis[]> {
    const store = services.storeService;
    const transcription = store.transcription;
    
    // Check if transcription has language set
    if (!transcription?.lang) {
      console.log('⚠️ SAVE-MANAGER: No language set, skipping spell check');
      return [];
    }
    
    try {
      // Get existing analysis from store to preserve it for cached words
      const existingRegion = store.regionById(regionId);
      const existingAnalysis = existingRegion?.regionAnalysis || [];
      
      // Get known words cache
      const globalKnownWords = store.getKnownWords();
      
      // Delegate to spellCheckerService for analysis
      const result = await services.spellCheckerService.analyzeRegionText(
        text,
        transcription.lang,
        globalKnownWords,
        existingAnalysis
      );
      
      // Add newly known words to global cache
      if (result.newlyKnown.length > 0) {
        store.addKnownWords(result.newlyKnown);
      }
      
      // Save merged analysis
      store.setRegionAnalysis(regionId, result.analysis);
      
      // Update RTE highlighting using ONLY this region's saved analysis
      const mainEditorKey = `${regionId}:main` as const;
      if (services.rteService.hasEditor(mainEditorKey)) {
        const issues = store.getIssuesForRegion(regionId);
        const issueHighlights = issueHighlightService.convertIssuesToHighlights(issues);
        services.rteService.applyHighlighting(mainEditorKey, {
          knownWords: result.analysis.map(item => item.word),
          issues: issueHighlights
        });
      }
      
      console.log(`📊 SAVE-MANAGER: Spell check results for ${regionId}:`, {
        newlyKnown: result.newlyKnown.length,
        totalSaved: result.analysis.length,
      });
      
      return result.analysis;
    } catch (error) {
      console.error('SAVE-MANAGER: Spell check error:', error);
      // Return empty array on error (graceful degradation)
      return [];
    }
  }
  
  /**
   * Reset the save timer
   */
  private resetSaveTimer(regionId: string, debounceMs: number): void {
    const queue = this.queues.get(regionId);
    if (!queue) return;
    
    // Clear existing timer
    if (queue.saveTimer) {
      Timeout.clear(queue.saveTimer);
    }
    
    // Set new timer
    const timeoutKey = `region-save-${regionId}`;
    queue.saveTimer = timeoutKey;
    
    Timeout.set(timeoutKey, async () => {
      await this.flush(regionId);
    }, debounceMs);
  }
  
  /**
   * Flush pending changes to database
   */
  private async flush(regionId: string): Promise<void> {
    const queue = this.queues.get(regionId);
    if (!queue) return;
    
    console.log(`💾 SAVE-MANAGER: Flushing saves for ${regionId}`, {
      pendingChanges: Object.keys(queue.pendingChanges),
      hasSpellCheckPromise: !!queue.spellCheckPromise
    });
    
    // CRITICAL: Wait for spell check if it's pending
    if (queue.spellCheckPromise) {
      try {
        console.log(`⏳ SAVE-MANAGER: Waiting for spell check to complete...`);
        const analysis = await Promise.race([
          queue.spellCheckPromise,
          this.timeout(5000, 'Spell check timeout')
        ]);
        
        // Analysis might already be in pendingChanges, but ensure it's there
        if (analysis && analysis.length > 0) {
          queue.pendingChanges.regionAnalysis = analysis;
          console.log(`✅ SAVE-MANAGER: Spell check already complete, including analysis`);
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Spell check timeout') {
          console.warn(`⚠️ SAVE-MANAGER: Spell check took >5s, saving without analysis`);
        } else {
          console.error(`❌ SAVE-MANAGER: Spell check error:`, error);
        }
      }
    }
    
    // Collect all changes
    const changes = { ...queue.pendingChanges };
    const pendingEditField = queue.pendingEditField;
    
    // Clear the queue BEFORE saving (prevent re-entry)
    this.clearQueue(regionId);
    
    // Perform the save
    try {
      const store = services.storeService;
      
      // Call regionService.updateRegion directly instead of going through UpdateRegionUseCase
      // This avoids the complexity of the use-case's execute() being void
      const user = services.authService.currentUser();
      if (!user) {
        console.warn('User not authenticated, skipping region update');
        return;
      }
      
      const currentVersion = store.getRegionVersion(regionId);
      
      console.log(`💾 SAVE-MANAGER: Saving region ${regionId}`, {
        changes: Object.keys(changes),
        hasRegionAnalysis: 'regionAnalysis' in changes,
        version: currentVersion
      });
      
      await services.regionService.updateRegion(
        regionId,
        changes,
        user.username,
        currentVersion
      );
      
      // Update version after successful save
      store.setRegionVersion(regionId, currentVersion + 1);
      
      // Update transcription metadata
      const region = store.regionById(regionId);
      if (region) {
        const updateTranscriptionUseCase = new UpdateTranscriptionUseCase({
          transcriptionId: region.transcriptionId,
          services,
          store: store,
        });
        await updateTranscriptionUseCase.execute();
      }
      
      // End pending edit
      if (pendingEditField) {
        services.storeService.endPendingEdit(regionId, pendingEditField);
      }
      
      console.log(`✅ SAVE-MANAGER: Save completed for ${regionId}`);
      
    } catch (error) {
      console.error(`❌ SAVE-MANAGER: Save failed for ${regionId}:`, error);
      
      // Check if this is a version conflict error
      if (isVersionConflictError(error)) {
        console.log(`⚠️ SAVE-MANAGER: Version conflict detected for ${regionId}, showing conflict dialog`);
        
        // Determine primary field from the changes
        const primaryField = changes.regionText !== undefined ? 'regionText' :
                           changes.translation !== undefined ? 'translation' :
                           'start';
        
        const store = services.storeService;
        const currentVersion = store.getRegionVersion(regionId);
        
        // Handle the conflict with the dialog
        await handleVersionConflict(
          regionId,
          changes,
          primaryField,
          currentVersion,
          store,
          // onAcceptRemote: Update local state with remote version
          async (remoteRegion) => {
            console.log(`✅ SAVE-MANAGER: User accepted remote version for ${regionId}`, {
              remoteVersion: (remoteRegion as { _version?: number })?._version,
              primaryField
            });
            
            // Update the store with the remote region data
            const remoteData = remoteRegion as Record<string, unknown>;
            
            // Update the specific field in the store
            if (primaryField === 'regionText' && remoteData.regionText !== undefined) {
              store.setRegionText(regionId, remoteData.regionText as string);
            } else if (primaryField === 'translation' && remoteData.translation !== undefined) {
              store.setRegionTranslation(regionId, remoteData.translation as string);
            }
            
            // Update the RTE editor with remote content
            if (primaryField === 'regionText') {
              const mainEditorKey = `${regionId}:main` as const;
              if (services.rteService.hasEditor(mainEditorKey)) {
                services.rteService.setContent(mainEditorKey, remoteData.regionText as string);
                console.log(`🔄 SAVE-MANAGER: Updated RTE editor with remote text`);
                
                // Reapply highlighting with region's analysis
                const region = store.regionById(regionId);
                const regionAnalysis = region?.regionAnalysis || [];
                const knownWords = regionAnalysis.map((item: { word: string }) => item.word);
                const issues = store.getIssuesForRegion(regionId);
                const issueHighlights = issueHighlightService.convertIssuesToHighlights(issues);
                
                services.rteService.applyHighlighting(mainEditorKey, {
                  knownWords,
                  issues: issueHighlights
                });
                console.log(`🎨 SAVE-MANAGER: Reapplied highlighting after accepting remote text`);
              }
            } else if (primaryField === 'translation') {
              const translationEditorKey = `${regionId}:translation` as const;
              if (services.rteService.hasEditor(translationEditorKey)) {
                services.rteService.setContent(translationEditorKey, remoteData.translation as string);
                console.log(`🔄 SAVE-MANAGER: Updated RTE editor with remote translation`);
                
                // Reapply highlighting with region's analysis
                const region = store.regionById(regionId);
                const regionAnalysis = region?.regionAnalysis || [];
                const knownWords = regionAnalysis.map((item: { word: string }) => item.word);
                const issues = store.getIssuesForRegion(regionId);
                const issueHighlights = issueHighlightService.convertIssuesToHighlights(issues);
                
                services.rteService.applyHighlighting(translationEditorKey, {
                  knownWords,
                  issues: issueHighlights
                });
                console.log(`🎨 SAVE-MANAGER: Reapplied highlighting after accepting remote translation`);
              }
            }
            
            // Update version
            const remoteVersion = (remoteData._version as number) || currentVersion + 1;
            store.setRegionVersion(regionId, remoteVersion);
            
            // End the pending edit
            if (pendingEditField) {
              services.storeService.endPendingEdit(regionId, pendingEditField);
            }
            
            console.log(`✅ SAVE-MANAGER: Local state updated with remote version`);
          },
          // onKeepLocal: Retry save with latest version
          async (latestVersion) => {
            console.log(`🔄 SAVE-MANAGER: User kept local version for ${regionId}, retrying save with version ${latestVersion}`);
            
            // Retry the save with the latest version
            await services.regionService.updateRegion(
              regionId,
              changes,
              services.authService.currentUser()!.username,
              latestVersion
            );
            
            // Update version after successful save
            store.setRegionVersion(regionId, latestVersion + 1);
            
            // Update transcription metadata
            const region = store.regionById(regionId);
            if (region) {
              const updateTranscriptionUseCase = new UpdateTranscriptionUseCase({
                transcriptionId: region.transcriptionId,
                services,
                store: store,
              });
              await updateTranscriptionUseCase.execute();
            }
            
            // End pending edit
            if (pendingEditField) {
              services.storeService.endPendingEdit(regionId, pendingEditField);
            }
            
            console.log(`✅ SAVE-MANAGER: Retry save completed for ${regionId}`);
          }
        );
      } else {
        // Not a conflict error, re-throw
        throw error;
      }
    }
  }
  
  /**
   * Cancel any pending saves for a region
   */
  cancelPendingSaves(regionId: string): void {
    this.clearQueue(regionId);
  }
  
  /**
   * Check if there are pending saves for a region
   */
  hasPendingSaves(regionId: string): boolean {
    return this.queues.has(regionId);
  }
  
  // Helper methods
  
  private getOrCreateQueue(regionId: string): SaveQueue {
    if (!this.queues.has(regionId)) {
      this.queues.set(regionId, {
        regionId,
        pendingChanges: {},
        spellCheckPromise: null,
        spellCheckTimer: null,
        saveTimer: null,
        lastChangeTime: Date.now(),
        lastChangeSource: 'text'
      });
    }
    return this.queues.get(regionId)!;
  }
  
  private clearQueue(regionId: string): void {
    const queue = this.queues.get(regionId);
    if (queue) {
      if (queue.spellCheckTimer) {
        Timeout.clear(queue.spellCheckTimer);
      }
      if (queue.saveTimer) {
        Timeout.clear(queue.saveTimer);
      }
    }
    this.queues.delete(regionId);
  }
  
  private timeout(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error(message)), ms)
    );
  }
  
  // For testing
  __clearAll(): void {
    this.queues.forEach(queue => {
      if (queue.spellCheckTimer) Timeout.clear(queue.spellCheckTimer);
      if (queue.saveTimer) Timeout.clear(queue.saveTimer);
    });
    this.queues.clear();
  }
  
  __getQueueForTesting(regionId: string): SaveQueue | undefined {
    return this.queues.get(regionId);
  }
}

export const regionSaveManager = new RegionSaveManagerImpl();

