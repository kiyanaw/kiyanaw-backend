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
    
    const queue = this.getOrCreateQueue(regionId);
    
    // Update pending changes
    queue.pendingChanges.regionText = text;
    queue.lastChangeSource = 'text';
    queue.lastChangeTime = Date.now();
    queue.pendingEditField = 'regionText';
    
    // Set save status to pending
    services.storeService.setSaveStatus('pending');
    
    // Cancel any existing spell check
    if (queue.spellCheckTimer) {
      Timeout.clear(queue.spellCheckTimer);
      queue.spellCheckPromise = null;
    }
    
    const spellCheckKey = `spell-check-${regionId}`;
    queue.spellCheckTimer = spellCheckKey;
    Timeout.set(
      spellCheckKey,
      async () => {
        queue.spellCheckPromise = this.performSpellCheck(regionId, text);
        try {
          const analysis = await queue.spellCheckPromise;
          queue.pendingChanges.regionAnalysis = analysis;
        } catch (error) {
          console.error(`SAVE-MANAGER: Spell check failed for ${regionId}:`, error);
          queue.spellCheckPromise = null;
        }
      },
      500
    );
    
    this.resetSaveTimer(regionId, 3000);
  }
  
  /**
   * Queue a translation change (no spell checking)
   */
  queueTranslationChange(regionId: string, translation: string): void {
    console.debug(`💾 SAVE-MANAGER: Queuing translation change for ${regionId}`);
    
    const queue = this.getOrCreateQueue(regionId);
    
    queue.pendingChanges.translation = translation;
    queue.lastChangeSource = 'translation';
    queue.lastChangeTime = Date.now();
    queue.pendingEditField = 'translation';
    
    // Set save status to pending
    services.storeService.setSaveStatus('pending');
    
    this.resetSaveTimer(regionId, 3000);
  }
  
  /**
   * Queue bounds change
   */
  queueBoundsChange(regionId: string, start: number, end: number): void {
    console.debug(`💾 SAVE-MANAGER: Queuing bounds change for ${regionId}`);
    
    const queue = this.getOrCreateQueue(regionId);
    
    queue.pendingChanges.start = start;
    queue.pendingChanges.end = end;
    queue.lastChangeSource = 'bounds';
    queue.lastChangeTime = Date.now();
    
    // Set save status to pending
    services.storeService.setSaveStatus('pending');
    
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
      // The rteService will automatically update highlighting via its store subscription
      store.setRegionAnalysis(regionId, result.analysis);
      
      // Save spelling suggestions
      store.setRegionSuggestions(regionId, result.suggestions || []);
      
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
    
    // Set status to saving
    services.storeService.setSaveStatus('saving');
    
    // Wait for spell check if pending
    await this.waitForSpellCheckCompletion(queue);
    
    // Collect changes and clear queue
    const changes = { ...queue.pendingChanges };
    const pendingEditField = queue.pendingEditField;
    this.clearQueue(regionId);
    
    // Perform the save
    try {
      await this.saveRegionChanges(regionId, changes, pendingEditField);
      
      // Only set to 'saved' if no other pending saves exist
      if (!this.hasAnyPendingSaves()) {
        services.storeService.setSaveStatus('saved');
      }
    } catch (error) {
      await this.handleSaveError(error, regionId, changes, pendingEditField);
    }
  }
  
  /**
   * Wait for pending spell check to complete (with timeout)
   */
  private async waitForSpellCheckCompletion(queue: SaveQueue): Promise<void> {
    if (!queue.spellCheckPromise) return;
    
    try {
      const analysis = await Promise.race([
        queue.spellCheckPromise,
        this.timeout(5000, 'Spell check timeout')
      ]);
      
      if (analysis && analysis.length > 0) {
        queue.pendingChanges.regionAnalysis = analysis;
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Spell check timeout') {
        console.warn('SAVE-MANAGER: Spell check took >5s, saving without analysis');
      } else {
        console.error('SAVE-MANAGER: Spell check error:', error);
      }
    }
  }
  
  /**
   * Save region changes to database and update metadata
   */
  private async saveRegionChanges(
    regionId: string,
    changes: PendingChanges,
    pendingEditField?: string
  ): Promise<void> {
    const store = services.storeService;
    const user = services.authService.currentUser();
    
    if (!user) {
      console.warn('User not authenticated, skipping region update');
      return;
    }
    
    const currentVersion = store.getRegionVersion(regionId);
    
    // Save to database
    await services.regionService.updateRegion(
      regionId,
      changes,
      user.username,
      currentVersion
    );
    
    // Update local version
    store.setRegionVersion(regionId, currentVersion + 1);
    
    // Update transcription metadata
    await this.updateTranscriptionMetadata(regionId);
    
    // End pending edit
    if (pendingEditField) {
      services.storeService.endPendingEdit(regionId, pendingEditField);
    }
  }
  
  /**
   * Update transcription metadata after region save
   */
  private async updateTranscriptionMetadata(regionId: string): Promise<void> {
    const store = services.storeService;
    const region = store.regionById(regionId);
    
    if (!region) return;
    
    const updateTranscriptionUseCase = new UpdateTranscriptionUseCase({
      transcriptionId: region.transcriptionId,
      services,
      store: store,
    });
    await updateTranscriptionUseCase.execute();
  }
  
  /**
   * Handle save errors (primarily version conflicts)
   */
  private async handleSaveError(
    error: unknown,
    regionId: string,
    changes: PendingChanges,
    pendingEditField?: string
  ): Promise<void> {
    console.error(`❌ SAVE-MANAGER: Save failed for ${regionId}:`, error);
    
    if (!isVersionConflictError(error)) {
      throw error;
    }
    
    console.debug(`⚠️ SAVE-MANAGER: Version conflict detected for ${regionId}`);
    
    const primaryField = this.determinePrimaryField(changes);
    const store = services.storeService;
    const currentVersion = store.getRegionVersion(regionId);
    
    await handleVersionConflict(
      regionId,
      changes as Record<string, unknown>,
      primaryField,
      currentVersion,
      store,
      (remoteRegion) => this.handleAcceptRemoteVersion(
        regionId,
        remoteRegion,
        primaryField,
        currentVersion,
        pendingEditField
      ),
      (latestVersion) => this.handleKeepLocalVersion(
        regionId,
        changes,
        latestVersion,
        pendingEditField
      )
    );
  }
  
  /**
   * Determine which field is the primary one being edited
   */
  private determinePrimaryField(changes: PendingChanges): 'regionText' | 'translation' | 'start' {
    if (changes.regionText !== undefined) return 'regionText';
    if (changes.translation !== undefined) return 'translation';
    return 'start';
  }
  
  /**
   * Handle user accepting remote version in conflict dialog
   */
  private async handleAcceptRemoteVersion(
    regionId: string,
    remoteRegion: unknown,
    primaryField: 'regionText' | 'translation' | 'start',
    currentVersion: number,
    pendingEditField?: string
  ): Promise<void> {
    const store = services.storeService;
    const remoteData = remoteRegion as Record<string, unknown>;
    
    console.debug(`✅ SAVE-MANAGER: User accepted remote version for ${regionId}`, {
      remoteVersion: remoteData._version,
      primaryField
    });
    
    // Update store with remote data
    this.updateStoreWithRemoteData(regionId, remoteData, primaryField);
    
    // Update RTE editor with remote content
    await this.updateEditorWithRemoteContent(regionId, remoteData, primaryField);
    
    // Update version
    const remoteVersion = (remoteData._version as number) || currentVersion + 1;
    store.setRegionVersion(regionId, remoteVersion);
    
    // End pending edit
    if (pendingEditField) {
      services.storeService.endPendingEdit(regionId, pendingEditField);
    }
    
    console.debug(`✅ SAVE-MANAGER: Local state updated with remote version`);
  }
  
  /**
   * Update store with remote region data
   */
  private updateStoreWithRemoteData(
    regionId: string,
    remoteData: Record<string, unknown>,
    primaryField: 'regionText' | 'translation' | 'start'
  ): void {
    const store = services.storeService;
    
    if (primaryField === 'regionText' && remoteData.regionText !== undefined) {
      store.setRegionText(regionId, remoteData.regionText as string);
    } else if (primaryField === 'translation' && remoteData.translation !== undefined) {
      store.setRegionTranslation(regionId, remoteData.translation as string);
    }
  }
  
  /**
   * Update RTE editor with remote content and reapply highlighting
   */
  private async updateEditorWithRemoteContent(
    regionId: string,
    remoteData: Record<string, unknown>,
    primaryField: 'regionText' | 'translation' | 'start'
  ): Promise<void> {
    if (primaryField === 'regionText') {
      await this.updateMainEditorWithRemote(regionId, remoteData.regionText as string);
    } else if (primaryField === 'translation') {
      await this.updateTranslationEditorWithRemote(regionId, remoteData.translation as string);
    }
  }
  
  /**
   * Update main text editor with remote content
   */
  private async updateMainEditorWithRemote(regionId: string, remoteText: string): Promise<void> {
    const mainEditorKey = `${regionId}:main` as const;
    if (!services.rteService.hasEditor(mainEditorKey)) return;
    
    services.rteService.setContent(mainEditorKey, remoteText);
    console.debug(`🔄 SAVE-MANAGER: Updated RTE editor with remote text`);
    
    await this.reapplyHighlighting(regionId, mainEditorKey);
  }
  
  /**
   * Update translation editor with remote content
   */
  private async updateTranslationEditorWithRemote(regionId: string, remoteTranslation: string): Promise<void> {
    const translationEditorKey = `${regionId}:translation` as const;
    if (!services.rteService.hasEditor(translationEditorKey)) return;
    
    services.rteService.setContent(translationEditorKey, remoteTranslation);
    console.debug(`🔄 SAVE-MANAGER: Updated RTE editor with remote translation`);
    
    await this.reapplyHighlighting(regionId, translationEditorKey);
  }
  
  /**
   * Reapply highlighting to editor after content update
   */
  private async reapplyHighlighting(
    regionId: string,
    editorKey: `${string}:main` | `${string}:translation`
  ): Promise<void> {
    const store = services.storeService;
    const region = store.regionById(regionId);
    const regionAnalysis = region?.regionAnalysis || [];
    const knownWords = regionAnalysis.map((item: { word: string }) => item.word);
    const issues = store.getIssuesForRegion(regionId);
    const issueHighlights = issueHighlightService.convertIssuesToHighlights(issues);
    
    services.rteService.queueHighlightingUpdate(editorKey, {
      knownWords,
      issues: issueHighlights
    });
    
    console.debug(`🎨 SAVE-MANAGER: Reapplied highlighting`);
  }
  
  /**
   * Handle user keeping local version in conflict dialog (retry save)
   */
  private async handleKeepLocalVersion(
    regionId: string,
    changes: PendingChanges,
    latestVersion: number,
    pendingEditField?: string
  ): Promise<void> {
    console.debug(`🔄 SAVE-MANAGER: User kept local version for ${regionId}, retrying with version ${latestVersion}`);
    
    const store = services.storeService;
    const user = services.authService.currentUser();
    
    if (!user) {
      console.warn('User not authenticated, cannot retry save');
      return;
    }
    
    // Retry save with latest version
    await services.regionService.updateRegion(
      regionId,
      changes,
      user.username,
      latestVersion
    );
    
    // Update version
    store.setRegionVersion(regionId, latestVersion + 1);
    
    // Update transcription metadata
    await this.updateTranscriptionMetadata(regionId);
    
    // End pending edit
    if (pendingEditField) {
      services.storeService.endPendingEdit(regionId, pendingEditField);
    }
    
    console.info(`✅ SAVE-MANAGER: Retry save completed for ${regionId}`);
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
  
  /**
   * Check if there are any pending saves across all regions
   */
  hasAnyPendingSaves(): boolean {
    return this.queues.size > 0;
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
  
  // Expose private methods for unit testing
  __waitForSpellCheckCompletion = this.waitForSpellCheckCompletion.bind(this);
  __saveRegionChanges = this.saveRegionChanges.bind(this);
  __updateTranscriptionMetadata = this.updateTranscriptionMetadata.bind(this);
  __handleSaveError = this.handleSaveError.bind(this);
  __determinePrimaryField = this.determinePrimaryField.bind(this);
  __handleAcceptRemoteVersion = this.handleAcceptRemoteVersion.bind(this);
  __handleKeepLocalVersion = this.handleKeepLocalVersion.bind(this);
  __updateStoreWithRemoteData = this.updateStoreWithRemoteData.bind(this);
  __updateEditorWithRemoteContent = this.updateEditorWithRemoteContent.bind(this);
  __reapplyHighlighting = this.reapplyHighlighting.bind(this);
}

export const regionSaveManager = new RegionSaveManagerImpl();

