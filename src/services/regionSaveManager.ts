import Timeout from 'smart-timeout';
import { services } from './index';
import { issueHighlightService } from './issueHighlightService';
import type { WordAnalysis } from './spellCheckerService';

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
   * Perform spell check and return analysis
   */
  private async performSpellCheck(regionId: string, text: string): Promise<WordAnalysis[]> {
    const store = services.storeService;
    const transcription = store.transcription;
    
    // Check if transcription has language set
    if (!transcription?.lang) {
      console.log('⚠️ SAVE-MANAGER: No language set, skipping spell check');
      return [];
    }
    
    // Tokenize
    const words = services.spellCheckerService.tokenize(text);
    if (words.length === 0) {
      return [];
    }
    
    // Get known words from cache
    const globalKnownWords = store.getKnownWords();
    const uniqueWords = [...new Set(words)];
    
    const knownAnalysis: WordAnalysis[] = [];
    const unknownUniqueWords: string[] = [];
    
    uniqueWords.forEach(word => {
      if (globalKnownWords.has(word)) {
        knownAnalysis.push({
          word,
          analysis: '',
          allAnalysis: []
        });
      } else {
        unknownUniqueWords.push(word);
      }
    });
    
    // Check unknown words via API
    if (unknownUniqueWords.length > 0) {
      try {
        const result = await services.spellCheckerService.check(
          unknownUniqueWords,
          transcription.lang
        );
        
        if (result.known.length > 0) {
          knownAnalysis.push(...result.known);
          store.addKnownWords(result.known);
        }
      } catch (error) {
        console.error('SAVE-MANAGER: Spell check API error:', error);
      }
    }
    
    // Update store with analysis (for immediate UI feedback)
    store.setRegionAnalysis(regionId, knownAnalysis);
    
    // Also update RTE highlighting
    const mainEditorKey = `${regionId}:main` as const;
    if (services.rteService.hasEditor(mainEditorKey)) {
      const issues = store.getIssuesForRegion(regionId);
      const issueHighlights = issueHighlightService.convertIssuesToHighlights(issues);
      services.rteService.applyHighlighting(mainEditorKey, {
        knownWords: knownAnalysis.map(item => item.word),
        issues: issueHighlights
      });
    }
    
    return knownAnalysis;
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
    
    // Determine primary field for conflict resolution
    const primaryField = queue.lastChangeSource === 'text' ? 'regionText' :
                        queue.lastChangeSource === 'translation' ? 'translation' :
                        'start';
    
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
        const { UpdateTranscriptionUseCase } = await import('../use-cases/update-transcription');
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
      // Re-throw to allow error handling upstream
      throw error;
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

