import { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Import quill-cursors for collaborative editing
import QuillCursors from 'quill-cursors';
import { textHighlightService, type IssueHighlight } from './textHighlightService';
import { type IssueType } from './adt';
import { useEditorStore } from '../stores/useEditorStore';
import { issueHighlightService } from './issueHighlightService';
import { issueMatchingService } from './issueMatchingService';
import { REGION_TEXT_MATCH_PATTERN } from '../constants/text-patterns';
import { type WordAnalysis, type SpellingSuggestion } from './adt';

// Import interfaces and blots from extracted modules
import type {
  DeltaConstructor,
  QuillInstance,
  QuillDelta,
  EditorKey,
  RTEConfig,
  RTEInstance,
  EditorDebugInfo,
} from './rteService.interfaces';
import { ISSUE_FORMATS, registerBlots } from './rteService.blots';

// Import pure computational utilities
import {
  findIssueMatches as findIssueMatchesUtil,
  findAmbiguousWordMatches as findAmbiguousWordMatchesUtil,
  findSpellingSuggestionMatches as findSpellingSuggestionMatchesUtil,
  filterMatchesByPriority as filterMatchesByPriorityUtil,
  computeFormatOperations as computeFormatOperationsUtil,
  parseQuillOpsToRanges,
  type CurrentRanges,
  type FormatOperation,
} from './rteService.utils';

// Re-export EditorKey and RTEConfig for external consumers
export type { EditorKey, RTEConfig };

const Delta = Quill.import('delta') as DeltaConstructor;

// Register Quill modules and custom blots
Quill.register('modules/cursors', QuillCursors);
registerBlots();

class RTEServiceImpl {
  // ==========================================================================
  // Properties
  // ==========================================================================

  /** Registry of all active RTE instances, keyed by EditorKey */
  private registry = new Map<EditorKey, RTEInstance>();

  /** Off-screen container for editors not currently attached to DOM */
  private offScreenParent: HTMLElement | null = null;

  /** Queues for serializing highlighting operations per editor */
  private highlightingQueues = new Map<EditorKey, Promise<void>>();

  /** Zustand store unsubscribe function */
  private storeUnsubscribe: (() => void) | null = null;

  /** Tracks previous regionAnalysis state to detect changes */
  private previousRegionAnalysisState = new Map<string, unknown>();

  /** Debug information for each editor */
  private editorDebugInfo = new Map<EditorKey, EditorDebugInfo>();

  /** Counter for tracking highlight operations */
  private highlightOperationCounter = 0;

  /** Version counter per editor to detect stale operations */
  private editorVersions = new Map<EditorKey, number>();

  // ==========================================================================
  // Lifecycle Methods
  // ==========================================================================

  /**
   * Constructs the RTE service.
   * Store subscription is initialized lazily on first attach.
   */
  constructor() {
    // Store subscription will be initialized lazily on first attach
  }

  /**
   * Creates a new Quill editor instance or returns an existing one.
   *
   * @param key - Unique identifier for the editor (format: "regionId:main" or "regionId:translation")
   * @param config - Configuration options for the editor
   * @returns The Quill instance
   */
  createOrGet(key: EditorKey, config: RTEConfig): QuillInstance {
    if (this.registry.has(key)) {
      return this.registry.get(key)!.quill;
    }

    // Create off-screen container
    const container = document.createElement('div');
    container.style.height = '100%';
    this.getOffScreenParent().appendChild(container);

    // Default configurations based on editor type
    const [, editorType] = key.split(':') as [string, 'main' | 'translation'];

    const defaultMainConfig = {
      theme: 'snow' as const,
      modules: {
        toolbar: false,
        cursors: {
          hideDelayMs: 5000,
          transformOnTextChange: true
        },
        clipboard: {
          matchVisual: false,
        },
      },
      formats: ['known-word', 'ambiguous-word', 'spelling-suggestion', 'issue-needs-help', 'issue-indexing', 'issue-new-word']
    };

    const defaultTranslationConfig = {
      theme: 'snow' as const,
      modules: {
        toolbar: false,
        clipboard: {
          matchVisual: false,
        },
      },
      formats: [] // Plain text only
    };

    const defaultConfig = editorType === 'main' ? defaultMainConfig : defaultTranslationConfig;
    const finalConfig = { ...defaultConfig, ...config };

    // Create Quill instance
    const quill = new Quill(container, finalConfig);

    // Disable browser spell checking
    const editor = quill.root;
    editor.setAttribute('spellcheck', 'false');
    editor.setAttribute('autocorrect', 'off');
    editor.setAttribute('autocapitalize', 'off');

    // Store in registry
    const rteInstance: RTEInstance = {
      quill,
      container,
      config: finalConfig
    };

    this.registry.set(key, rteInstance);
    this.updateDebugInfo(key, 'editor-created', { incrementVersion: true, editorType });
    this.editorVersions.set(key, (this.editorVersions.get(key) ?? 0) + 1);

    // Add to window for debugging
    if (typeof window !== 'undefined') {
      if (!window.debugEditors) {
        window.debugEditors = {};
      }
      window.debugEditors[key] = quill;
      console.debug(`Added editor "${key}" to window.debugEditors`);
    }

    return quill;
  }

  /**
   * Attaches an editor to a host DOM element.
   * Moves the editor from off-screen storage to the visible DOM.
   *
   * @param key - The editor key
   * @param hostElement - The DOM element to attach the editor to
   * @throws Error if the editor doesn't exist
   */
  attach(key: EditorKey, hostElement: HTMLElement): void {
    const instance = this.registry.get(key);
    if (!instance) {
      throw new Error(`RTE instance not found for key: ${key}`);
    }

    // Initialize store subscription lazily on first attach
    this.initializeStoreSubscription();

    // Remove from current parent (if any)
    if (instance.container.parentNode) {
      instance.container.parentNode.removeChild(instance.container);
    }

    const regionId = key.split(':')[0];
    const state = useEditorStore.getState();
    const region = state.regionById(regionId);
    if (region) {
      this.previousRegionAnalysisState.set(regionId, region.regionAnalysis);
    }

    // Attach to new host
    hostElement.appendChild(instance.container);
    const version = this.editorVersions.get(key) ?? 0;
    this.updateDebugInfo(key, 'editor-attached', {
      host: hostElement.className || hostElement.id || 'unknown',
      regionId,
      incrementVersion: true,
      version,
    });

    // Set readonly state based on config
    if (instance.config.readonly) {
      instance.quill.disable();
    } else {
      instance.quill.enable();
    }

    // Trigger initial highlighting
    this.updateIssueHighlighting(regionId);
  }

  /**
   * Detaches an editor from its host element.
   * Moves the editor back to off-screen storage for later reattachment.
   *
   * @param key - The editor key
   */
  detach(key: EditorKey): void {
    const instance = this.registry.get(key);
    if (!instance) {
      return; // Already detached or never existed
    }

    // Remove from current parent and put back in off-screen parent
    if (instance.container.parentNode) {
      instance.container.parentNode.removeChild(instance.container);
    }

    const regionId = key.split(':')[0];
    this.getOffScreenParent().appendChild(instance.container);
    this.editorVersions.set(key, (this.editorVersions.get(key) ?? 0) + 1);
    this.updateDebugInfo(key, 'editor-detached', {
      regionId,
      version: this.editorVersions.get(key),
    });

    // Clean up tracking for this region
    this.previousRegionAnalysisState.delete(regionId);
  }

  /**
   * Destroys an editor instance and removes it from the registry.
   * Cleans up all resources associated with the editor.
   *
   * @param key - The editor key
   */
  destroy(key: EditorKey): void {
    const instance = this.registry.get(key);
    if (!instance) {
      return;
    }

    // Clean up event listeners - Quill will handle cleanup when DOM element is removed

    // Cancel any pending highlighting queue for this editor
    this.highlightingQueues.delete(key);

    // Remove from DOM
    if (instance.container.parentNode) {
      instance.container.parentNode.removeChild(instance.container);
    }

    // Remove from registry
    this.registry.delete(key);
    this.editorDebugInfo.delete(key);
    this.editorVersions.delete(key);
    this.updateDebugInfo(key, 'editor-destroyed', { incrementVersion: true });
  }

  /**
   * Destroys all editor instances and cleans up all resources.
   * Useful for testing or app shutdown.
   */
  destroyAll(): void {
    for (const key of this.registry.keys()) {
      this.destroy(key);
    }

    // Clean up store subscription
    if (this.storeUnsubscribe) {
      this.storeUnsubscribe();
      this.storeUnsubscribe = null;
    }

    // Clean up tracking
    this.previousRegionAnalysisState.clear();
    this.highlightingQueues.clear();

    // Clean up off-screen parent
    if (this.offScreenParent && this.offScreenParent.parentNode) {
      this.offScreenParent.parentNode.removeChild(this.offScreenParent);
      this.offScreenParent = null;
    }
  }

  /**
   * Gets the Quill instance for an editor.
   *
   * @param key - The editor key
   * @returns The Quill instance or null if not found
   */
  getInstance(key: EditorKey): QuillInstance | null {
    return this.registry.get(key)?.quill || null;
  }

  /**
   * Checks if an editor exists in the registry.
   *
   * @param key - The editor key
   * @returns True if the editor exists
   */
  hasEditor(key: EditorKey): boolean {
    return this.registry.has(key);
  }

  // ==========================================================================
  // Content Management
  // ==========================================================================

  /**
   * Sets the text content of an editor.
   * Uses 'api' source to avoid triggering text-change events.
   *
   * @param key - The editor key
   * @param content - The text content to set
   * @throws Error if the editor doesn't exist
   */
  setContent(key: EditorKey, content: string): void {
    const instance = this.registry.get(key);
    if (!instance) {
      throw new Error(`RTE instance not found for key: ${key}`);
    }

    // Use 'api' source to avoid triggering text-change events
    instance.quill.setText(content || '', 'api');
  }

  /**
   * Gets the word/token at a specific cursor position.
   * Returns null if cursor is in whitespace or punctuation.
   *
   * @param key - The editor key
   * @param index - The cursor position
   * @returns The word at the position or null
   */
  getWordAt(key: EditorKey, index: number): string | null {
    const instance = this.registry.get(key);
    if (!instance) {
      return null;
    }

    const text = instance.quill.getText();
    if (index < 0 || index >= text.length) {
      return null;
    }

    // Only return a word if cursor is actually inside a word character
    // This prevents showing analysis/suggestions when cursor is in whitespace
    const charAtCursor = text[index];
    const charBeforeCursor = index > 0 ? text[index - 1] : '';

    // Cursor must be on a word char OR between word chars (for mid-word positions)
    const isOnWordChar = REGION_TEXT_MATCH_PATTERN.test(charAtCursor);
    const isAfterWordChar = REGION_TEXT_MATCH_PATTERN.test(charBeforeCursor);

    // If cursor is not on or immediately after a word char, return null
    if (!isOnWordChar && !isAfterWordChar) {
      return null;
    }

    // If cursor is after a word but on whitespace/punctuation, return null
    if (!isOnWordChar && isAfterWordChar && (charAtCursor === ' ' || charAtCursor === '\n')) {
      return null;
    }

    // Find word boundaries around the index
    let start = index;
    let end = index;

    // Move start backwards to find word beginning
    while (start > 0 && REGION_TEXT_MATCH_PATTERN.test(text[start - 1])) {
      start--;
    }

    // Move end forwards to find word end
    while (end < text.length && REGION_TEXT_MATCH_PATTERN.test(text[end])) {
      end++;
    }

    // Extract the word
    const word = text.slice(start, end).trim();
    return word || null;
  }

  // ==========================================================================
  // Event Subscriptions
  // ==========================================================================

  /**
   * Subscribes to text change events from the editor.
   * Only fires for user-initiated changes, not API changes.
   * Automatically strips inherited word-level formats from inserted text.
   *
   * @param key - The editor key
   * @param callback - Function called with the new text content
   * @throws Error if the editor doesn't exist
   */
  onTextChange(key: EditorKey, callback: (text: string) => void): void {
    const instance = this.registry.get(key);
    if (!instance) {
      throw new Error(`RTE instance not found for key: ${key}`);
    }

    // Store callback
    instance.textChangeCallback = callback;

    // Set up Quill text-change listener that only responds to user changes
    instance.quill.on('text-change', (delta: QuillDelta, _oldDelta: QuillDelta, source: string) => {
      // Only trigger callback for user-initiated changes, not API changes
      if (source === 'user') {
        // Immediately strip inherited word-level formats from inserted text
        // This prevents the "blue flash" when typing at end of formatted words
        this.stripInheritedFormats(instance, delta);

        const plainText = instance.quill.getText().trim();
        callback(plainText);
      }
    });
  }

  /**
   * Unsubscribes from text change events.
   *
   * @param key - The editor key
   */
  offTextChange(key: EditorKey): void {
    const instance = this.registry.get(key);
    if (!instance) {
      return; // Already removed or never existed
    }

    // Remove callback
    instance.textChangeCallback = undefined;

    // Remove Quill listeners (Quill will remove all listeners for 'text-change')
    instance.quill.off('text-change');
  }

  /**
   * Subscribes to selection change events from the editor.
   *
   * @param key - The editor key
   * @param callback - Function called with the new selection range (or null if blurred)
   * @throws Error if the editor doesn't exist
   */
  onSelectionChange(key: EditorKey, callback: (range: { index: number; length: number } | null) => void): void {
    const instance = this.registry.get(key);
    if (!instance) {
      throw new Error(`RTE instance not found for key: ${key}`);
    }

    // Set up Quill selection-change listener
    instance.quill.on('selection-change', (range: { index: number; length: number } | null) => {
      callback(range);
    });
  }

  /**
   * Unsubscribes from selection change events.
   *
   * @param key - The editor key
   */
  offSelectionChange(key: EditorKey): void {
    const instance = this.registry.get(key);
    if (!instance) {
      return; // Already removed or never existed
    }

    // Remove Quill listeners
    instance.quill.off('selection-change');
  }

  // ==========================================================================
  // Selection & Cursor Queries
  // ==========================================================================

  /**
   * Gets the current cursor position (caret index).
   *
   * @param key - The editor key
   * @returns The cursor index or null if editor not found or no selection
   */
  getSelection(key: EditorKey): number | null {
    const instance = this.registry.get(key);
    if (!instance) {
      return null;
    }

    const selection = instance.quill.getSelection();
    return selection ? selection.index : null;
  }

  /**
   * Gets the current selection range (index and length).
   *
   * @param key - The editor key
   * @returns The selection range or null if editor not found or no selection
   */
  getSelectionRange(key: EditorKey): { index: number; length: number } | null {
    const instance = this.registry.get(key);
    if (!instance) {
      return null;
    }

    const selection = instance.quill.getSelection();
    return selection ? { index: selection.index, length: selection.length } : null;
  }

  /**
   * Gets the currently selected text.
   *
   * @param key - The editor key
   * @returns The selected text or null if no selection
   */
  getSelectedText(key: EditorKey): string | null {
    const instance = this.registry.get(key);
    if (!instance) {
      return null;
    }

    const selection = instance.quill.getSelection();
    if (!selection || selection.length === 0) {
      return null;
    }

    return instance.quill.getText(selection.index, selection.length).trim();
  }

  /**
   * Gets issue context (id and type) at a specific cursor position.
   * Used to determine if the cursor is within an issue-highlighted word.
   *
   * @param key - The editor key
   * @param index - The cursor position
   * @returns Object with issueId and type, or nulls if not in an issue
   */
  getIssueContext(key: EditorKey, index: number): { issueId: string | null; type: IssueType | null } {
    const instance = this.registry.get(key);
    if (!instance) {
      return { issueId: null, type: null };
    }

    // Get formatting at the specified index
    const formats = instance.quill.getFormat(index);

    // Check each issue format type
    for (const formatName of ISSUE_FORMATS) {
      const formatValue = formats[formatName];
      if (formatValue) {
        // Extract type from format name
        const type = formatName.replace('issue-', '') as IssueType;
        const issueId = typeof formatValue === 'string' ? formatValue : null;
        return { issueId, type };
      }
    }

    return { issueId: null, type: null };
  }

  // ==========================================================================
  // Highlighting (Public API)
  // ==========================================================================

  /**
   * Queues a highlighting update to prevent concurrent modifications.
   * Ensures only one highlighting operation runs at a time per editor.
   * Operations are chained sequentially to prevent race conditions.
   *
   * @param key - The editor key
   * @param options - Highlighting options (known words, issues, ambiguous indices, etc.)
   * @returns Promise that resolves when the operation completes
   */
  queueHighlightingUpdate(
    key: EditorKey,
    options: { knownWords?: string[]; issues?: IssueHighlight[]; ambiguousIndices?: Set<number>; regionAnalysis?: WordAnalysis[]; spellingSuggestions?: SpellingSuggestion[] }
  ): Promise<void> {
    const editorVersion = this.editorVersions.get(key) ?? 0;
    const hasExistingQueue = this.highlightingQueues.has(key);
    const existingQueue = this.highlightingQueues.get(key) || Promise.resolve();
    const operationId = ++this.highlightOperationCounter;

    this.updateDebugInfo(key, 'highlight-queue-scheduled', {
      operationId,
      hasExistingQueue,
      knownWords: options.knownWords?.length ?? 0,
      ambiguousIndices: options.ambiguousIndices?.size ?? 0,
      issues: options.issues?.length ?? 0,
      editorVersion,
    });

    // Chain the new operation onto the existing queue
    const newQueue = existingQueue
      .then(() => {
        this.updateDebugInfo(key, 'highlight-queue-run', { operationId });
        this.applyHighlightingInternal(key, options, { operationId, editorVersion });
        this.updateDebugInfo(key, 'highlight-queue-complete', { operationId });
      })
      .catch((error) => {
        const snapshot = this.getDebugSnapshot(key);
        console.debug(`Highlighting queue error for ${key}:`, error, {
          operationId,
          snapshot,
        });
        // Don't propagate the error - let the queue continue
      });

    // Store the new queue
    this.highlightingQueues.set(key, newQueue);

    // Clean up the queue after it completes
    newQueue.finally(() => {
      if (this.highlightingQueues.get(key) === newQueue) {
        this.highlightingQueues.delete(key);
      }
    });

    return newQueue;
  }

  /**
   * Triggers issue highlighting update for a specific region.
   * Uses requestAnimationFrame to defer until after React finishes reconciliation.
   * This is the main entry point for store-triggered highlighting updates.
   *
   * @param regionId - The region ID to update highlighting for
   */
  updateIssueHighlighting(regionId: string): void {
    const editorKey = `${regionId}:main` as EditorKey;
    const instance = this.registry.get(editorKey);
    if (!instance) {
      return;
    }

    // Capture the current editor version
    const expectedVersion = this.editorVersions.get(editorKey) ?? 0;

    // Use double RAF to ensure React has fully committed and browser has painted
    // This is the proper way to defer DOM mutations until the UI is stable
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Check if editor version changed (detach/reattach happened)
        const currentVersion = this.editorVersions.get(editorKey) ?? 0;
        if (currentVersion !== expectedVersion) {
          console.debug(`Skipping highlighting for ${regionId} - editor version changed (${expectedVersion} -> ${currentVersion})`);
          return;
        }

        // Check if editor is still mounted
        if (!this.isEditorConnected(instance)) {
          console.debug(`Skipping highlighting for ${regionId} - editor no longer connected`);
          return;
        }

      this.performIssueHighlighting(regionId);
      });
    });
  }

  // ==========================================================================
  // Highlighting (Private Implementation)
  // ==========================================================================

  /**
   * Performs the actual highlighting application.
   * This is the core highlighting logic that computes diffs and applies format changes.
   *
   * @param key - The editor key
   * @param options - Highlighting options
   * @param debugContext - Optional debug context for tracking operations
   */
  private applyHighlightingInternal(
    key: EditorKey,
    options: { knownWords?: string[]; issues?: IssueHighlight[]; ambiguousIndices?: Set<number>; regionAnalysis?: WordAnalysis[]; spellingSuggestions?: SpellingSuggestion[] },
    debugContext: { operationId?: number; editorVersion?: number } = {}
  ): void {
    const instance = this.registry.get(key);
    if (!instance) return;

    if (!this.isEditorConnected(instance)) {
      console.debug(`Skipping highlighting for ${key} - editor no longer mounted`);
      return;
    }

    const text = instance.quill.getText();
    if (!text) return;

    const { knownWords = [], issues = [], ambiguousIndices = new Set(), regionAnalysis = [], spellingSuggestions = [] } = options;
    const currentSelection = instance.quill.getSelection();
    const textLength = text.length;

    // Check version to avoid stale operations
    const operationId = debugContext.operationId ?? null;
    const expectedVersion = debugContext.editorVersion ?? null;
    const currentVersion = this.editorVersions.get(key) ?? 0;
    if (expectedVersion !== null && expectedVersion !== currentVersion) {
      this.updateDebugInfo(key, 'highlight-skip-stale-version', {
        operationId,
        expectedVersion,
        currentVersion,
      });
      return;
    }

    this.updateDebugInfo(key, 'highlight-apply-start', {
      operationId,
      knownWords: knownWords.length,
      ambiguousIndices: ambiguousIndices.size,
      issues: issues.length,
    });

    // Find all desired matches
    const knownWordsSet = new Set(knownWords);
    const desiredKnownWordMatches = knownWords.length > 0
      ? textHighlightService.findMatches(text, knownWordsSet)
      : [];
    const desiredAmbiguousWordMatches = this.findAmbiguousWordMatches(text, ambiguousIndices, regionAnalysis);
    const desiredSpellingSuggestionMatches = spellingSuggestions.length > 0
      ? this.findSpellingSuggestionMatches(text, spellingSuggestions)
      : [];
    const desiredIssueMatches = issues.length > 0 ? this.findIssueMatches(text, issues) : [];

    // Filter matches by priority (issues > spelling > ambiguous > known)
    const { filteredKnown, filteredAmbiguous, filteredSpelling } = this.filterMatchesByPriority(
      desiredKnownWordMatches,
      desiredAmbiguousWordMatches,
      desiredSpellingSuggestionMatches,
      desiredIssueMatches
    );

    // Convert to ranges
    const toRange = (match: { index: number; length: number }) => ({
      start: match.index,
      end: match.index + match.length,
    });

    const desiredRanges = {
      known: filteredKnown.map(toRange),
      ambiguous: filteredAmbiguous.map(toRange),
      spelling: filteredSpelling.map(toRange),
      issues: desiredIssueMatches.map(match => ({
        ...toRange(match),
        type: match.type,
        id: match.id,
      })),
    };

    // Collect current ranges and compute diff
    const currentRanges = this.collectCurrentRanges(instance);
    const operations = this.computeFormatOperations(currentRanges, desiredRanges, textLength);

    // Apply all format changes in two batches (remove, then add)
    this.applyConsolidatedDelta(instance, key, operations, 'remove', operationId);
    this.applyConsolidatedDelta(instance, key, operations, 'add', operationId);

    // Log completion
    const knownOps = operations.filter(op => op.origin === 'known').length;
    const ambiguousOps = operations.filter(op => op.origin === 'ambiguous').length;
    const spellingOps = operations.filter(op => op.origin === 'spelling').length;
    const issueOps = operations.filter(op => op.origin === 'issue').length;

    this.updateDebugInfo(key, 'highlight-apply-finish', {
      operationId,
      knownOps,
      ambiguousOps,
      spellingOps,
      issueOps,
    });

    // Restore cursor position
    this.restoreSelection(instance, key, currentSelection);
  }

  /**
   * Performs issue highlighting for a specific region.
   * Fetches data from the store and coordinates the highlighting process.
   *
   * @param regionId - The region ID
   */
  private async performIssueHighlighting(regionId: string): Promise<void> {
    const editorKey = `${regionId}:main` as EditorKey;
    const instance = this.registry.get(editorKey);
    if (!instance) {
      return;
    }

    // Validate that the Quill editor is still mounted and functional
    try {
      if (!instance.quill || !instance.quill.container || !instance.quill.container.isConnected) {
        console.warn(`Skipping issue highlighting for ${regionId} - editor no longer mounted`);
        return;
      }
    } catch (error) {
      console.warn(`Skipping issue highlighting for ${regionId} - editor validation failed:`, error);
      return;
    }

    // Get current state from store
    const state = useEditorStore.getState();

    // ONLY use this region's own analysis for highlighting, not the global cache
    const region = state.regionById(regionId);
    // Defensive: ensure regionAnalysis is an array (can be corrupted by conflict resolution)
    const regionAnalysis = Array.isArray(region?.regionAnalysis) ? region.regionAnalysis : [];
    const knownWords: string[] = regionAnalysis.map(item => item.word);
    const spellingSuggestions = region?.regionSuggestions || [];

    // Identify ambiguous word OCCURRENCES (multiple analyses + not user-selected)
    // Pass the indices of ambiguous entries in the regionAnalysis array
    const ambiguousIndices = new Set<number>();
    regionAnalysis.forEach((item, idx) => {
      if (item.allAnalysis.length > 1 && item.source !== 'user') {
        ambiguousIndices.add(idx);
      }
    });

    const issues = state.getIssuesForRegion(regionId);

    // Get current text from editor
    const regionText = instance.quill.getText();

    const matchResult = issueMatchingService.match(regionText, issues);

    // Update store with link statuses and suggestions
    const linkStatuses: Record<string, 'matched' | 'unmatched'> = {};
    for (const issueId of matchResult.matched) {
      linkStatuses[issueId] = 'matched';
    }
    for (const issueId of matchResult.unmatched) {
      linkStatuses[issueId] = 'unmatched';
    }

    state.setIssueLinkStatuses(regionId, linkStatuses);
    state.setIssueSuggestions(regionId, matchResult.suggestions);

    // Only highlight matched issues
    const matchedIssues = issues.filter(issue => matchResult.matched.has(issue.id));
    const issueHighlights = issueHighlightService.convertIssuesToHighlights(matchedIssues);

    // Use queued highlighting to prevent race conditions
    try {
      await this.queueHighlightingUpdate(editorKey, {
        knownWords,
        ambiguousIndices,
        regionAnalysis, // Pass full analysis array for position-based matching
        spellingSuggestions, // Pass spelling suggestions for orange underline
        issues: issueHighlights
      });
    } catch (error) {
      console.warn(`React-Quill corrupted for ${regionId}, resetting editor:`, error);
      this.resetCorruptedEditor(editorKey, regionText, knownWords, issueHighlights, ambiguousIndices, regionAnalysis);
    }
  }

  /**
   * Finds issue matches in text by delegating to the utility function.
   *
   * @param text - The text to search
   * @param issues - Array of issues to find
   * @returns Array of issue matches with positions
   */
  private findIssueMatches(text: string, issues: IssueHighlight[]) {
    return findIssueMatchesUtil(text, issues);
  }

  /**
   * Finds ambiguous word matches by delegating to the utility function.
   *
   * @param text - The text to search
   * @param ambiguousIndices - Set of word indices that are ambiguous
   * @param regionAnalysis - Analysis data for word positions
   * @returns Array of ambiguous word matches
   */
  private findAmbiguousWordMatches(
    text: string,
    ambiguousIndices: Set<number>,
    regionAnalysis: WordAnalysis[]
  ) {
    return findAmbiguousWordMatchesUtil(text, ambiguousIndices, regionAnalysis);
  }

  /**
   * Finds spelling suggestion matches by delegating to the utility function.
   *
   * @param text - The text to search
   * @param spellingSuggestions - Array of spelling suggestions
   * @returns Array of spelling matches
   */
  private findSpellingSuggestionMatches(
    text: string,
    spellingSuggestions: SpellingSuggestion[]
  ) {
    return findSpellingSuggestionMatchesUtil(text, spellingSuggestions);
  }

  /**
   * Filters matches by priority to avoid overlapping highlights.
   * Priority order: issues > spelling > ambiguous > known.
   *
   * @param knownMatches - Known word matches
   * @param ambiguousMatches - Ambiguous word matches
   * @param spellingMatches - Spelling suggestion matches
   * @param issueMatches - Issue matches (highest priority)
   * @returns Filtered match arrays
   */
  private filterMatchesByPriority(
    knownMatches: Array<{ index: number; length: number }>,
    ambiguousMatches: Array<{ index: number; length: number }>,
    spellingMatches: Array<{ index: number; length: number }>,
    issueMatches: Array<{ index: number; length: number }>
  ) {
    return filterMatchesByPriorityUtil(knownMatches, ambiguousMatches, spellingMatches, issueMatches);
  }

  /**
   * Collects current format ranges from the editor by parsing Quill content.
   *
   * @param instance - The RTE instance
   * @returns Current format ranges by type
   */
  private collectCurrentRanges(instance: RTEInstance): CurrentRanges {
    if (!this.isEditorConnected(instance)) {
      return { known: [], ambiguous: [], spelling: [], issues: [] };
    }

    const contents = instance.quill.getContents();
    return parseQuillOpsToRanges(contents.ops ?? []);
  }

  /**
   * Computes format operations by diffing current and desired ranges.
   *
   * @param currentRanges - Currently applied format ranges
   * @param desiredRanges - Desired format ranges
   * @param textLength - Length of the text (for bounds checking)
   * @returns Array of format operations to apply
   */
  private computeFormatOperations(
    currentRanges: CurrentRanges,
    desiredRanges: CurrentRanges,
    textLength: number
  ): FormatOperation[] {
    return computeFormatOperationsUtil(currentRanges, desiredRanges, textLength);
  }

  /**
   * Applies a consolidated delta to the editor for a specific phase (remove or add).
   * Groups operations by phase and applies them in a single Quill update.
   *
   * @param instance - The RTE instance
   * @param key - The editor key
   * @param operations - Array of format operations
   * @param phase - Whether to apply 'remove' or 'add' operations
   * @param operationId - Debug operation ID
   */
  private applyConsolidatedDelta(
    instance: RTEInstance,
    key: EditorKey,
    operations: Array<{
      index: number;
      length: number;
      value: boolean | string | null;
      phase: 'remove' | 'add';
      formatName: string;
    }>,
    phase: 'remove' | 'add',
    operationId: number | null
  ): void {
    const subset = operations
      .filter(op => op.phase === phase)
      .sort((a, b) => a.index - b.index);

    if (subset.length === 0 || !this.isEditorConnected(instance)) {
      return;
    }

    const delta = new Delta();
    let cursor = 0;

    for (const op of subset) {
      if (!this.isEditorConnected(instance)) return;

      if (op.index > cursor) {
        delta.retain(op.index - cursor);
        cursor = op.index;
      }

      const attrValue = phase === 'remove' ? null : (op.value === null ? true : op.value);
      delta.retain(op.length, { [op.formatName]: attrValue });
      cursor = op.index + op.length;
    }

    if (delta.ops.length === 0) return;

    try {
      this.updateDebugInfo(key, 'highlight-delta-apply', {
        operationId,
        phase,
        operations: subset.length,
        formats: [...new Set(subset.map(op => op.formatName))].join(', '),
      });
      instance.quill.updateContents(delta as Parameters<QuillInstance['updateContents']>[0], 'silent');
    } catch (error) {
      const isCorruption = error instanceof Error && error.message.includes('mutations');
      if (isCorruption) {
        const snapshot = this.getDebugSnapshot(key);
        console.warn(`Highlight delta corruption for ${key}`, {
          operationId,
          phase,
          operations: subset.length,
          snapshot,
        });
        throw error;
      }
      console.warn(`Failed to apply consolidated delta for ${key}:`, error);
    }
  }

  /**
   * Restores cursor selection after formatting operations.
   * Includes Safari-specific workaround for visual cursor refresh issues.
   *
   * @param instance - The RTE instance
   * @param key - The editor key
   * @param selection - The selection to restore (or null to skip)
   */
  private restoreSelection(
    instance: RTEInstance,
    key: EditorKey,
    selection: { index: number; length: number } | null
  ): void {
    if (!selection) return;

    try {
      if (instance.quill && instance.quill.container && instance.quill.container.isConnected) {
        instance.quill.setSelection(selection, 'api');

        // Safari-specific visual cursor refresh
        if (typeof window !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
          setTimeout(() => {
            if (instance.quill && instance.quill.container && instance.quill.container.isConnected) {
              instance.quill.blur();
              instance.quill.focus();
              instance.quill.setSelection(selection, 'api');
            }
          }, 10);
        }
      }
    } catch (error) {
      console.warn(`Failed to restore selection for ${key}:`, error);
    }
  }

  /**
   * Resets a corrupted React-Quill editor by recreating content and formatting.
   * Used as a recovery mechanism when Quill gets into an inconsistent state.
   *
   * @param key - The editor key
   * @param text - The text content to restore
   * @param knownWords - Known words to highlight
   * @param issueHighlights - Issues to highlight
   * @param ambiguousIndices - Indices of ambiguous words
   * @param regionAnalysis - Analysis data for the region
   */
  private resetCorruptedEditor(
    key: EditorKey,
    text: string,
    knownWords: string[],
    issueHighlights: IssueHighlight[],
    ambiguousIndices: Set<number> = new Set(),
    regionAnalysis: WordAnalysis[] = []
  ): void {
    try {
      const instance = this.registry.get(key);
      if (!instance) return;

      console.debug(`Resetting corrupted editor: ${key}`);

      // Capture current cursor position before reset
      const savedSelection = instance.quill.getSelection();

      // Clear all formatting and reset content
      instance.quill.setText('', 'api');

      // Wait a tick for React-Quill to stabilize
      setTimeout(() => {
        try {
          // Set the text content
          instance.quill.setText(text, 'api');

          // Reapply highlighting after another tick
          setTimeout(() => {
            try {
              this.applyHighlightingInternal(key, { knownWords, ambiguousIndices, regionAnalysis, issues: issueHighlights });

              // Restore cursor position if it was saved
              if (savedSelection) {
                try {
                  instance.quill.setSelection(savedSelection, 'api');
                } catch (error) {
                  console.warn(`Failed to restore cursor position for ${key}:`, error);
                }
              }
            } catch (error) {
              console.warn(`Failed to reapply highlighting after reset for ${key}:`, error);
              // If it still fails, just leave it as plain text
            }
          }, 10);
        } catch (error) {
          console.warn(`Failed to reset editor content for ${key}:`, error);
        }
      }, 10);
    } catch (error) {
      console.warn(`Failed to reset corrupted editor ${key}:`, error);
    }
  }

  // ==========================================================================
  // Internal Utilities
  // ==========================================================================

  /**
   * Checks if an editor instance is connected to the DOM.
   *
   * @param instance - The RTE instance to check
   * @returns True if the editor is connected and functional
   */
  private isEditorConnected(instance?: RTEInstance | null): boolean {
    if (!instance || !instance.quill) {
      return false;
    }

    try {
      const { container } = instance.quill;
      return Boolean(container?.isConnected);
    } catch {
      return false;
    }
  }

  /**
   * Gets or creates the off-screen parent element for detached editors.
   * Editors are stored here when not attached to visible DOM.
   *
   * @returns The off-screen parent element
   */
  private getOffScreenParent(): HTMLElement {
    if (!this.offScreenParent && typeof document !== 'undefined') {
      this.offScreenParent = document.createElement('div');
      this.offScreenParent.style.position = 'absolute';
      this.offScreenParent.style.left = '-9999px';
      this.offScreenParent.style.top = '-9999px';
      this.offScreenParent.style.visibility = 'hidden';
      document.body.appendChild(this.offScreenParent);
    }
    return this.offScreenParent!;
  }

  /**
   * Initializes the Zustand store subscription for automatic highlighting updates.
   * Called lazily on first editor attach to avoid SSR issues.
   */
  private initializeStoreSubscription(): void {
    // Already subscribed
    if (this.storeUnsubscribe) return;

    // Only initialize in browser environment and if subscribe exists
    if (typeof window === 'undefined') return;
    if (typeof useEditorStore.subscribe !== 'function') return;

    this.storeUnsubscribe = useEditorStore.subscribe((state) => {
      // Check each region that has an active editor
      const regionsToUpdate: string[] = [];

      state.regions.forEach((region) => {
        const editorKey = `${region.id}:main` as EditorKey;

        // Only process if this region has an active editor
        if (!this.hasEditor(editorKey)) {
          return;
        }

        // Check if regionAnalysis changed for this region
        const currentAnalysis = region.regionAnalysis;
        const previousAnalysis = this.previousRegionAnalysisState.get(region.id);

        // Simple reference equality check - if the array reference changed, update
        if (currentAnalysis !== previousAnalysis) {
          // Update our tracking
          this.previousRegionAnalysisState.set(region.id, currentAnalysis);
          regionsToUpdate.push(region.id);
        }
      });

      // CRITICAL: Defer highlighting updates to next animation frame to avoid React-Quill corruption
      // Zustand subscriptions fire synchronously during React's event handling
      // We must wait for the browser to paint before touching Quill
      if (regionsToUpdate.length > 0) {
        regionsToUpdate.forEach(regionId => {
          this.updateIssueHighlighting(regionId);
        });
      }
    });
  }

  /**
   * Strips inherited word-level formats from newly inserted text.
   *
   * Quill's Inline blots are "sticky" - when typing at the end of a formatted word,
   * new characters inherit the format. This causes bad UX where newly typed text
   * appears blue (known-word format) until spell-check runs ~500ms later.
   *
   * This method immediately strips word-level formats from inserted characters,
   * so they appear as plain text until proper highlighting runs.
   *
   * Note: Issue formats are NOT stripped - they should persist across edits.
   *
   * @param instance - The RTE instance
   * @param delta - The Quill delta describing the change
   */
  private stripInheritedFormats(instance: RTEInstance, delta: QuillDelta): void {
    if (!delta.ops) return;

    let position = 0;

    for (const op of delta.ops) {
      if (op.retain !== undefined) {
        position += op.retain;
      } else if (op.insert !== undefined && typeof op.insert === 'string') {
        const insertLength = op.insert.length;

        // Strip word-level formats from inserted text only (not the entire word)
        // This prevents the "flashing" effect where existing formatted text briefly loses formatting
        // when typing at word boundaries
        instance.quill.formatText(position, insertLength, {
          'known-word': false,
          'ambiguous-word': false,
          'spelling-suggestion': false,
        }, 'silent');

        position += insertLength;
      } else if (op.delete !== undefined) {
        // Deletions don't change position for subsequent ops
      }
    }
  }

  /**
   * Updates debug information for an editor.
   * Used for tracking editor lifecycle and highlighting operations.
   *
   * @param key - The editor key
   * @param event - The event name
   * @param details - Additional details to record
   */
  private updateDebugInfo(
    key: EditorKey,
    event: string,
    details: Record<string, unknown> = {}
  ): void {
    const existing = this.editorDebugInfo.get(key) ?? {
      version: 0,
      lastEvent: 'init',
      lastTimestamp: 0,
    };

    const { incrementVersion, ...restDetails } = details;
    const nextInfo: EditorDebugInfo = {
      version: incrementVersion ? existing.version + 1 : existing.version,
      lastEvent: event,
      lastTimestamp: Date.now(),
      lastDetails: restDetails,
    };

    this.editorDebugInfo.set(key, nextInfo);

  }

  /**
   * Gets a snapshot of debug information for an editor.
   *
   * @param key - The editor key
   * @returns Copy of the debug info or null if not found
   */
  private getDebugSnapshot(key: EditorKey): EditorDebugInfo | null {
    const info = this.editorDebugInfo.get(key);
    return info ? { ...info } : null;
  }
}

export const rteService = new RTEServiceImpl();
