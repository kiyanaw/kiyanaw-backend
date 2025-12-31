import { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Import quill-cursors for collaborative editing
import QuillCursors from 'quill-cursors';
import { textHighlightService, type IssueHighlight } from './textHighlightService';
import { type IssueType, ISSUE_TYPE_VALUES } from './adt';
import { useEditorStore } from '../stores/useEditorStore';
import { issueHighlightService } from './issueHighlightService';
import { issueMatchingService } from './issueMatchingService';
import { REGION_TEXT_MATCH_PATTERN } from '../constants/text-patterns';
import { type WordAnalysis, type SpellingSuggestion } from './adt';

// Derive issue format names from centralized ISSUE_TYPE_VALUES
const ISSUE_FORMATS = ISSUE_TYPE_VALUES.map(type => `issue-${type}` as const);

interface DeltaInstance {
  ops: Array<Record<string, unknown>>;
  retain(count: number, attributes?: Record<string, unknown>): DeltaInstance;
}

type DeltaConstructor = {
  new (): DeltaInstance;
};

const Delta = Quill.import('delta') as DeltaConstructor;

// Quill-related interfaces
interface QuillModulesConfig extends Record<string, unknown> {
  toolbar?: boolean | object;
  cursors?: {
    hideDelayMs?: number;
    transformOnTextChange?: boolean;
  };
  clipboard?: {
    matchVisual?: boolean;
  };
}

interface QuillDelta {
  ops?: Array<{
    insert?: string;
    delete?: number;
    retain?: number;
    attributes?: Record<string, unknown>;
  }>;
}

// Quill instance type - using the constructor type
type QuillInstance = InstanceType<typeof Quill>;

// Extend window for debugging
declare global {
  interface Window {
    debugEditors?: Record<string, QuillInstance>;
  }
}
Quill.register('modules/cursors', QuillCursors);

// Register custom formats with Quill
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Inline = Quill.import('blots/inline') as any;

interface BlotInstance {
  domNode: HTMLElement;
  format(name: string, value: boolean | string): void;
}

class KnownWordBlot extends Inline implements BlotInstance {
  declare domNode: HTMLElement;
  
  static blotName = 'known-word';
  static tagName = 'span';
  static className = 'known-word';
  
  static create() {
    const node = super.create();
    node.setAttribute('class', 'known-word');
    return node;
  }
  
  static formats(node: HTMLElement) {
    return node.getAttribute('class') === 'known-word';
  }
  
  format(name: string, value: boolean | string) {
    if (name !== 'known-word' || !value) {
      super.format(name, value);
    } else {
      this.domNode.setAttribute('class', 'known-word');
    }
  }
}

class IssueNeedsHelpBlot extends Inline implements BlotInstance {
  declare domNode: HTMLElement;
  
  static blotName = 'issue-needs-help';
  static tagName = 'span';
  static className = 'issue-needs-help';
  
  static create(value?: string) {
    const node = super.create();
    node.setAttribute('class', 'issue-needs-help');
    if (value) {
      node.setAttribute('data-issue-id', value);
    }
    return node;
  }
  
  static formats(node: HTMLElement) {
    if (node.getAttribute('class') === 'issue-needs-help') {
      return node.getAttribute('data-issue-id') || true;
    }
    return false;
  }
  
  format(name: string, value: boolean | string) {
    if (name !== 'issue-needs-help' || !value) {
      super.format(name, value);
    } else {
      this.domNode.setAttribute('class', 'issue-needs-help');
      if (typeof value === 'string') {
        this.domNode.setAttribute('data-issue-id', value);
      }
    }
  }
}

class IssueIndexingBlot extends Inline implements BlotInstance {
  declare domNode: HTMLElement;
  
  static blotName = 'issue-indexing';
  static tagName = 'span';
  static className = 'issue-indexing';
  
  static create(value?: string) {
    const node = super.create();
    node.setAttribute('class', 'issue-indexing');
    if (value) {
      node.setAttribute('data-issue-id', value);
    }
    return node;
  }
  
  static formats(node: HTMLElement) {
    if (node.getAttribute('class') === 'issue-indexing') {
      return node.getAttribute('data-issue-id') || true;
    }
    return false;
  }
  
  format(name: string, value: boolean | string) {
    if (name !== 'issue-indexing' || !value) {
      super.format(name, value);
    } else {
      this.domNode.setAttribute('class', 'issue-indexing');
      if (typeof value === 'string') {
        this.domNode.setAttribute('data-issue-id', value);
      }
    }
  }
}

class IssueNewWordBlot extends Inline implements BlotInstance {
  declare domNode: HTMLElement;
  
  static blotName = 'issue-new-word';
  static tagName = 'span';
  static className = 'issue-new-word';
  
  static create(value?: string) {
    const node = super.create();
    node.setAttribute('class', 'issue-new-word');
    if (value) {
      node.setAttribute('data-issue-id', value);
    }
    return node;
  }
  
  static formats(node: HTMLElement) {
    if (node.getAttribute('class') === 'issue-new-word') {
      return node.getAttribute('data-issue-id') || true;
    }
    return false;
  }
  
  format(name: string, value: boolean | string) {
    if (name !== 'issue-new-word' || !value) {
      super.format(name, value);
    } else {
      this.domNode.setAttribute('class', 'issue-new-word');
      if (typeof value === 'string') {
        this.domNode.setAttribute('data-issue-id', value);
      }
    }
  }
}

class AmbiguousWordBlot extends Inline implements BlotInstance {
  declare domNode: HTMLElement;
  
  static blotName = 'ambiguous-word';
  static tagName = 'span';
  static className = 'ambiguous-word';
  
  static create() {
    const node = super.create();
    node.setAttribute('class', 'ambiguous-word');
    return node;
  }
  
  static formats(node: HTMLElement) {
    return node.getAttribute('class') === 'ambiguous-word';
  }
  
  format(name: string, value: boolean | string) {
    if (name !== 'ambiguous-word' || !value) {
      super.format(name, value);
    } else {
      this.domNode.setAttribute('class', 'ambiguous-word');
    }
  }
}

class SpellingSuggestionBlot extends Inline implements BlotInstance {
  declare domNode: HTMLElement;
  
  static blotName = 'spelling-suggestion';
  static tagName = 'span';
  static className = 'spelling-suggestion';
  
  static create() {
    const node = super.create();
    node.setAttribute('class', 'spelling-suggestion');
    return node;
  }
  
  static formats(node: HTMLElement) {
    return node.getAttribute('class') === 'spelling-suggestion';
  }
  
  format(name: string, value: boolean | string) {
    if (name !== 'spelling-suggestion' || !value) {
      super.format(name, value);
    } else {
      this.domNode.setAttribute('class', 'spelling-suggestion');
    }
  }
}

Quill.register('formats/known-word', KnownWordBlot);
Quill.register('formats/issue-needs-help', IssueNeedsHelpBlot);
Quill.register('formats/issue-indexing', IssueIndexingBlot);
Quill.register('formats/issue-new-word', IssueNewWordBlot);
Quill.register('formats/ambiguous-word', AmbiguousWordBlot);
Quill.register('formats/spelling-suggestion', SpellingSuggestionBlot);

// Custom formats are now defined in src/index.css

export type EditorKey = `${string}:${'main' | 'translation'}`;

export interface RTEConfig {
  readonly?: boolean;
  placeholder?: string;
  theme?: 'snow' | 'bubble';
  formats?: string[];
  modules?: QuillModulesConfig;
}

interface RTEInstance {
  quill: QuillInstance; // Quill instance
  container: HTMLElement; // Off-screen container
  config: RTEConfig;
  textChangeCallback?: (text: string) => void;
}

interface EditorDebugInfo {
  version: number;
  lastEvent: string;
  lastTimestamp: number;
  lastDetails?: Record<string, unknown>;
}

class RTEServiceImpl {
  private registry = new Map<EditorKey, RTEInstance>();
  private offScreenParent: HTMLElement | null = null;
  private highlightingQueues = new Map<EditorKey, Promise<void>>();
  private storeUnsubscribe: (() => void) | null = null;
  private previousRegionAnalysisState = new Map<string, unknown>();
  private editorDebugInfo = new Map<EditorKey, EditorDebugInfo>();
  private highlightOperationCounter = 0;
  private editorVersions = new Map<EditorKey, number>();

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

  private getDebugSnapshot(key: EditorKey): EditorDebugInfo | null {
    const info = this.editorDebugInfo.get(key);
    return info ? { ...info } : null;
  }

  constructor() {
    // Store subscription will be initialized lazily on first attach
  }

  /**
   * Subscribe to store changes and automatically trigger highlighting updates
   * when regionAnalysis changes for any region
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

  // Utility method to get quill instance (for direct manipulation if needed)
  getInstance(key: EditorKey): QuillInstance | null {
    return this.registry.get(key)?.quill || null;
  }

  // Utility method to check if an editor exists
  hasEditor(key: EditorKey): boolean {
    return this.registry.has(key);
  }

  // Content management
  setContent(key: EditorKey, content: string): void {
    const instance = this.registry.get(key);
    if (!instance) {
      throw new Error(`RTE instance not found for key: ${key}`);
    }

    // Use 'api' source to avoid triggering text-change events
    instance.quill.setText(content || '', 'api');
  }

  // Text change event management
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
   */
  private stripInheritedFormats(instance: RTEInstance, delta: QuillDelta): void {
    if (!delta.ops) return;
    
    const text = instance.quill.getText();
    let position = 0;
    
    for (const op of delta.ops) {
      if (op.retain !== undefined) {
        position += op.retain;
      } else if (op.insert !== undefined && typeof op.insert === 'string') {
        const insertLength = op.insert.length;
        
        // Find the word boundaries around the insertion point
        // This ensures the ENTIRE word gets its formatting stripped, not just the inserted chars
        const wordBounds = this.findWordBoundsAt(text, position, insertLength);
        
        // Strip word-level formats from the entire word (not issue formats - those persist)
        instance.quill.formatText(wordBounds.start, wordBounds.length, {
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
   * Finds the word boundaries around a given position in the text.
   * Used to determine the full extent of a word when stripping inherited formats.
   * 
   * @param text - The full text content
   * @param insertPos - Position where text was inserted
   * @param insertLength - Length of inserted text
   * @returns Object with start position and length of the word
   */
  private findWordBoundsAt(text: string, insertPos: number, insertLength: number): { start: number; length: number } {
    // Word boundary pattern (matches word characters including Unicode letters)
    const isWordChar = (char: string): boolean => {
      return /[\p{L}\p{N}]/u.test(char);
    };
    
    // Find start of word (scan backwards from insert position)
    let start = insertPos;
    while (start > 0 && isWordChar(text[start - 1])) {
      start--;
    }
    
    // Find end of word (scan forwards from end of inserted text)
    // Note: text already includes the inserted characters
    let end = insertPos + insertLength;
    while (end < text.length && isWordChar(text[end])) {
      end++;
    }
    
    return { start, length: end - start };
  }

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

  // Find issue matches in text (similar to findMatches but for issues)
  private findIssueMatches(text: string, issues: IssueHighlight[]) {
    if (!text || issues.length === 0) {
      return [];
    }

    const matches: Array<{ index: number; length: number; id: string; type: IssueType }> = [];
    const tokens = text.split(REGION_TEXT_MATCH_PATTERN);
    let currentIndex = 0;
    
    // Create issue text lookup for efficient matching
    // Normalize issue text the same way tokens are created: extract letters/numbers/_/- only
    const issueTextMap = new Map<string, { id: string; type: IssueType }>();
    for (const issue of issues) {
      const normalized = issue.text.trim().toLowerCase();
      const match = normalized.match(REGION_TEXT_MATCH_PATTERN);
      const key = match ? match[0] : normalized;
      issueTextMap.set(key, { id: issue.id, type: issue.type });
    }
    
    for (const token of tokens) {
      if (REGION_TEXT_MATCH_PATTERN.test(token)) {
        const lowerToken = token.trim().toLowerCase();
        const issueInfo = issueTextMap.get(lowerToken);
        if (issueInfo) {
          matches.push({
            index: currentIndex,
            length: token.length,
            id: issueInfo.id,
            type: issueInfo.type
          });
        }
      }
      currentIndex += token.length;
    }
    
    // Sort by index for safe RTE formatting
    return matches.sort((a, b) => {
      if (a.index !== b.index) return a.index - b.index;
      return b.length - a.length;
    });
  }

  // Apply known words formatting to editor
  // @deprecated - Use applyHighlighting instead for better performance
  applyKnownWordsFormatting(key: EditorKey, knownWords: string[]): void {
    const instance = this.registry.get(key);
    if (!instance || knownWords.length === 0) {
      return;
    }

    const text = instance.quill.getText();
    if (!text) return;

    // Clear any existing known-word formatting first
    instance.quill.formatText(0, text.length, 'known-word', false, 'api');

    // Use centralized service to find matches
    const knownWordsSet = new Set(knownWords);
    const matches = textHighlightService.findMatches(text, knownWordsSet);
    
    // Apply known-word class to all matches
    matches.forEach(({ index, length }) => {
      instance.quill.formatText(index, length, 'known-word', true, 'api');
    });
  }

  // Apply issue formatting to editor
  applyIssueFormatting(key: EditorKey, issues: IssueHighlight[]): void {
    const instance = this.registry.get(key);
    if (!instance || issues.length === 0) {
      return;
    }

    const text = instance.quill.getText();
    if (!text) return;

    // Clear any existing issue formatting first with safety checks
    ['issue-needs-help', 'issue-indexing', 'issue-new-word'].forEach(format => {
      try {
        // Validate editor is still connected
        if (!instance.quill || !instance.quill.container || !instance.quill.container.isConnected) {
          console.debug(`🚫 Skipping format clear for ${key} - editor disconnected`);
          return;
        }
        
        instance.quill.formatText(0, text.length, format, false, 'api');
      } catch (error) {
        console.debug(`🚫 Failed to clear format ${format} for ${key}:`, error);
      }
    });

    // Find issue matches
    const matches = this.findIssueMatches(text, issues);
    
    // Apply specific issue formatting based on type with safety checks
    matches.forEach(({ index, length, type, id }) => {
      try {
        // Validate editor is still connected
        if (!instance.quill || !instance.quill.container || !instance.quill.container.isConnected) {
          console.debug(`🚫 Skipping issue format for ${key} - editor disconnected`);
          return;
        }
        
        const formatName = `issue-${type}`;
        instance.quill.formatText(index, length, formatName, id, 'api');
      } catch (error) {
        console.debug(`🚫 Failed to apply issue format for ${key}:`, error, { index, length, type, id });
      }
    });
  }

  /**
   * Queue a highlighting update to prevent concurrent modifications
   * This ensures only one highlighting operation runs at a time per editor
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
   * @deprecated Use queueHighlightingUpdate instead to prevent race conditions
   */
  applyHighlighting(key: EditorKey, options: { knownWords?: string[]; issues?: IssueHighlight[]; ambiguousIndices?: Set<number>; regionAnalysis?: WordAnalysis[]; spellingSuggestions?: SpellingSuggestion[] }): void {
    // For backwards compatibility, synchronously call the internal method
    // New code should use queueHighlightingUpdate
    this.applyHighlightingInternal(key, options);
  }

  /**
   * Find ambiguous word matches by position using regionAnalysis indices
   */
  private findAmbiguousWordMatches(
    text: string,
    ambiguousIndices: Set<number>,
    regionAnalysis: WordAnalysis[]
  ): Array<{ word: string; index: number; length: number }> {
    const matches: Array<{ word: string; index: number; length: number }> = [];
    
    if (ambiguousIndices.size === 0 || regionAnalysis.length === 0) {
      return matches;
    }

    const tokens = text.split(REGION_TEXT_MATCH_PATTERN);
    let charPos = 0;
    let knownWordIdx = 0;
    
    for (const token of tokens) {
      if (REGION_TEXT_MATCH_PATTERN.test(token)) {
        const lowerToken = token.toLowerCase();
        if (knownWordIdx < regionAnalysis.length && regionAnalysis[knownWordIdx].word.toLowerCase() === lowerToken) {
          if (ambiguousIndices.has(knownWordIdx)) {
            matches.push({ word: token, index: charPos, length: token.length });
          }
          knownWordIdx++;
        }
      }
      charPos += token.length;
    }
    
    return matches;
  }

  /**
   * Find spelling suggestion matches in text
   */
  private findSpellingSuggestionMatches(
    text: string,
    spellingSuggestions: SpellingSuggestion[]
  ): Array<{ word: string; index: number; length: number }> {
    const matches: Array<{ word: string; index: number; length: number }> = [];
    
    if (spellingSuggestions.length === 0) {
      return matches;
    }

    // Build a set of misspelled words from suggestions
    const misspelledWords = new Set(spellingSuggestions.map(s => s.word.toLowerCase()));
    
    // Find all occurrences of misspelled words in the text
    const tokens = text.split(REGION_TEXT_MATCH_PATTERN);
    let charPos = 0;
    
    for (const token of tokens) {
      if (REGION_TEXT_MATCH_PATTERN.test(token)) {
        const lowerToken = token.toLowerCase();
        if (misspelledWords.has(lowerToken)) {
          matches.push({ word: token, index: charPos, length: token.length });
        }
      }
      charPos += token.length;
    }
    
    return matches;
  }

  /**
   * Filter matches to avoid overlaps (issues take priority over spelling, spelling over ambiguous, ambiguous over known)
   */
  private filterMatchesByPriority(
    knownMatches: Array<{ index: number; length: number }>,
    ambiguousMatches: Array<{ index: number; length: number }>,
    spellingMatches: Array<{ index: number; length: number }>,
    issueMatches: Array<{ index: number; length: number }>
  ): {
    filteredKnown: Array<{ index: number; length: number }>;
    filteredAmbiguous: Array<{ index: number; length: number }>;
    filteredSpelling: Array<{ index: number; length: number }>;
  } {
    const toRange = (match: { index: number; length: number }) => ({
      start: match.index,
      end: match.index + match.length,
    });

    const rangesOverlap = (
      start: number,
      end: number,
      ranges: Array<{ start: number; end: number }>
    ): boolean => ranges.some(range => start < range.end && end > range.start);

    const issueRanges = issueMatches.map(toRange);
    const spellingRanges = spellingMatches.map(toRange);
    const ambiguousRanges = ambiguousMatches.map(toRange);

    // Issues take priority over everything
    const filteredSpelling = spellingMatches.filter(match => {
      const start = match.index;
      const end = match.index + match.length;
      return !rangesOverlap(start, end, issueRanges);
    });

    // Ambiguous takes priority over known, but not over issues or spelling
    const filteredAmbiguous = ambiguousMatches.filter(match => {
      const start = match.index;
      const end = match.index + match.length;
      return !rangesOverlap(start, end, issueRanges) && !rangesOverlap(start, end, spellingRanges);
    });

    // Known words have lowest priority
    const filteredKnown = knownMatches.filter(match => {
      const start = match.index;
      const end = match.index + match.length;
      return !rangesOverlap(start, end, issueRanges) && 
             !rangesOverlap(start, end, spellingRanges) && 
             !rangesOverlap(start, end, ambiguousRanges);
    });

    return { filteredKnown, filteredAmbiguous, filteredSpelling };
  }

  /**
   * Collect current format ranges from the editor
   */
  private collectCurrentRanges(instance: RTEInstance): {
    known: Array<{ start: number; end: number }>;
    ambiguous: Array<{ start: number; end: number }>;
    spelling: Array<{ start: number; end: number }>;
    issues: Array<{ start: number; end: number; type: IssueType; id: string | null }>;
  } {
    if (!this.isEditorConnected(instance)) {
      return { known: [], ambiguous: [], spelling: [], issues: [] };
    }

    const contents = instance.quill.getContents();
    const known: Array<{ start: number; end: number }> = [];
    const ambiguous: Array<{ start: number; end: number }> = [];
    const spelling: Array<{ start: number; end: number }> = [];
    const issues: Array<{ start: number; end: number; type: IssueType; id: string | null }> = [];

    let cursor = 0;
    for (const op of contents.ops ?? []) {
      const insert = op.insert;
      const segment = typeof insert === 'string' ? insert : '\uFFFC';
      const segmentLength = segment.length;
      if (segmentLength === 0) continue;

      const attrs = op.attributes || {};

      if (attrs['known-word']) {
        known.push({ start: cursor, end: cursor + segmentLength });
      }

      if (attrs['ambiguous-word']) {
        ambiguous.push({ start: cursor, end: cursor + segmentLength });
      }

      if (attrs['spelling-suggestion']) {
        spelling.push({ start: cursor, end: cursor + segmentLength });
      }

      for (const formatName of ISSUE_FORMATS) {
        const value = attrs[formatName];
        if (value) {
          const type = formatName.replace('issue-', '') as IssueType;
          issues.push({
            start: cursor,
            end: cursor + segmentLength,
            type,
            id: typeof value === 'string' ? value : null,
          });
        }
      }

      cursor += segmentLength;
    }

    return { known, ambiguous, spelling, issues };
  }

  /**
   * Apply a consolidated delta to the editor
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
        console.warn(`🔄 Highlight delta corruption for ${key}`, {
          operationId,
          phase,
          operations: subset.length,
          snapshot,
        });
        throw error;
      }
      console.warn(`🚫 Failed to apply consolidated delta for ${key}:`, error);
    }
  }

  /**
   * Compute format operations by diffing current and desired ranges
   */
  private computeFormatOperations(
    currentRanges: {
      known: Array<{ start: number; end: number }>;
      ambiguous: Array<{ start: number; end: number }>;
      spelling: Array<{ start: number; end: number }>;
      issues: Array<{ start: number; end: number; type: IssueType; id: string | null }>;
    },
    desiredRanges: {
      known: Array<{ start: number; end: number }>;
      ambiguous: Array<{ start: number; end: number }>;
      spelling: Array<{ start: number; end: number }>;
      issues: Array<{ start: number; end: number; type: IssueType; id: string | null }>;
    },
    textLength: number
  ): Array<{
    index: number;
    length: number;
    value: boolean | string | null;
    phase: 'remove' | 'add';
    origin: 'known' | 'ambiguous' | 'spelling' | 'issue';
    formatName: string;
  }> {
    type FormatOperation = {
      index: number;
      length: number;
      value: boolean | string | null;
      phase: 'remove' | 'add';
      origin: 'known' | 'ambiguous' | 'spelling' | 'issue';
      formatName: string;
    };

    const operations: FormatOperation[] = [];

    const queueOperation = (
      index: number,
      length: number,
      value: boolean | string | null,
      phase: 'remove' | 'add',
      origin: 'known' | 'ambiguous' | 'spelling' | 'issue',
      formatName: string
    ): void => {
      if (length <= 0 || index < 0 || index >= textLength) return;
      const safeLength = Math.min(length, textLength - index);
      if (safeLength <= 0) return;
      operations.push({ index, length: safeLength, value, phase, origin, formatName });
    };

    const rangeKey = (range: { start: number; end: number }) => `${range.start}-${range.end}`;
    const issueRangeKey = (range: { start: number; end: number; type: IssueType }) => 
      `${range.start}-${range.end}-${range.type}`;

    // Diff simple formats (known, ambiguous, spelling)
    const diffSimple = (
      current: Array<{ start: number; end: number }>,
      desired: Array<{ start: number; end: number }>,
      origin: 'known' | 'ambiguous' | 'spelling',
      formatName: string
    ) => {
      const currentMap = new Map(current.map(r => [rangeKey(r), r]));
      const desiredMap = new Map(desired.map(r => [rangeKey(r), r]));

      currentMap.forEach((range, key) => {
        if (!desiredMap.has(key)) {
          queueOperation(range.start, range.end - range.start, false, 'remove', origin, formatName);
        }
      });

      desiredMap.forEach((range, key) => {
        if (!currentMap.has(key)) {
          queueOperation(range.start, range.end - range.start, true, 'add', origin, formatName);
        }
      });
    };

    // Diff issue formats
    const diffIssues = (
      current: Array<{ start: number; end: number; type: IssueType; id: string | null }>,
      desired: Array<{ start: number; end: number; type: IssueType; id: string | null }>
    ) => {
      const currentMap = new Map(current.map(r => [issueRangeKey(r), r]));
      const desiredMap = new Map(desired.map(r => [issueRangeKey(r), r]));

      currentMap.forEach((range, key) => {
        if (!desiredMap.has(key)) {
          const formatName = `issue-${range.type}`;
          queueOperation(range.start, range.end - range.start, false, 'remove', 'issue', formatName);
        }
      });

      desiredMap.forEach((range, key) => {
        const existing = currentMap.get(key);
        if (!existing || existing.id !== range.id) {
          const formatName = `issue-${range.type}`;
          queueOperation(range.start, range.end - range.start, range.id ?? true, 'add', 'issue', formatName);
        }
      });
    };

    diffSimple(currentRanges.known, desiredRanges.known, 'known', 'known-word');
    diffSimple(currentRanges.ambiguous, desiredRanges.ambiguous, 'ambiguous', 'ambiguous-word');
    diffSimple(currentRanges.spelling, desiredRanges.spelling, 'spelling', 'spelling-suggestion');
    diffIssues(currentRanges.issues, desiredRanges.issues);

    return operations;
  }

  /**
   * Restore cursor selection after formatting (with Safari fix)
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
      console.warn(`🚫 Failed to restore selection for ${key}:`, error);
    }
  }

  // Apply both known words and issue formatting (issues take priority)
  // Uses selective formatting removal to avoid cursor jumping
  private applyHighlightingInternal(
    key: EditorKey,
    options: { knownWords?: string[]; issues?: IssueHighlight[]; ambiguousIndices?: Set<number>; regionAnalysis?: WordAnalysis[]; spellingSuggestions?: SpellingSuggestion[] },
    debugContext: { operationId?: number; editorVersion?: number } = {}
  ): void {
    const instance = this.registry.get(key);
    if (!instance) return;

    if (!this.isEditorConnected(instance)) {
      console.debug(`🚫 Skipping highlighting for ${key} - editor no longer mounted`);
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

  // Get current selection index (caret position)
  getSelection(key: EditorKey): number | null {
    const instance = this.registry.get(key);
    if (!instance) {
      return null;
    }

    const selection = instance.quill.getSelection();
    return selection ? selection.index : null;
  }

  // Get current selection range (index + length)
  getSelectionRange(key: EditorKey): { index: number; length: number } | null {
    const instance = this.registry.get(key);
    if (!instance) {
      return null;
    }

    const selection = instance.quill.getSelection();
    return selection ? { index: selection.index, length: selection.length } : null;
  }

  // Get the currently selected text
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

  // Subscribe to selection changes
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

  // Unsubscribe from selection changes
  offSelectionChange(key: EditorKey): void {
    const instance = this.registry.get(key);
    if (!instance) {
      return; // Already removed or never existed
    }

    // Remove Quill listeners
    instance.quill.off('selection-change');
  }

  // Get issue context at a specific index
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

  // Get the word/token at a specific index
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

  // Clean up all editors (useful for testing or app shutdown)
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
   * Update issue highlighting for a specific region's editor
   * Uses requestAnimationFrame to defer until after React finishes reconciliation
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
          console.debug(`🚫 Skipping highlighting for ${regionId} - editor version changed (${expectedVersion} → ${currentVersion})`);
          return;
        }

        // Check if editor is still mounted
        if (!this.isEditorConnected(instance)) {
          console.debug(`🚫 Skipping highlighting for ${regionId} - editor no longer connected`);
          return;
        }

      this.performIssueHighlighting(regionId);
      });
    });
  }

  /**
   * Perform the actual issue highlighting (called after debounce)
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
        console.warn(`🚫 Skipping issue highlighting for ${regionId} - editor no longer mounted`);
        return;
      }
    } catch (error) {
      console.warn(`🚫 Skipping issue highlighting for ${regionId} - editor validation failed:`, error);
      return;
    }

    // Get current state from store
    const state = useEditorStore.getState();
    
    // ONLY use this region's own analysis for highlighting, not the global cache
    const region = state.regionById(regionId);
    const regionAnalysis = region?.regionAnalysis || [];
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
      console.warn(`🔄 React-Quill corrupted for ${regionId}, resetting editor:`, error);
      this.resetCorruptedEditor(editorKey, regionText, knownWords, issueHighlights, ambiguousIndices, regionAnalysis);
    }
  }

  /**
   * Reset a corrupted React-Quill editor by recreating it with fresh content and formatting
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

      console.debug(`🔄 Resetting corrupted editor: ${key}`);

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
              this.applyHighlighting(key, { knownWords, ambiguousIndices, regionAnalysis, issues: issueHighlights });
              
              // Restore cursor position if it was saved
              if (savedSelection) {
                try {
                  instance.quill.setSelection(savedSelection, 'api');
                } catch (error) {
                  console.warn(`🚫 Failed to restore cursor position for ${key}:`, error);
                }
              }
            } catch (error) {
              console.warn(`🚫 Failed to reapply highlighting after reset for ${key}:`, error);
              // If it still fails, just leave it as plain text
            }
          }, 10);
        } catch (error) {
          console.warn(`🚫 Failed to reset editor content for ${key}:`, error);
        }
      }, 10);
    } catch (error) {
      console.warn(`🚫 Failed to reset corrupted editor ${key}:`, error);
    }
  }
}

export const rteService = new RTEServiceImpl(); 