import { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Import quill-cursors for collaborative editing
import QuillCursors from 'quill-cursors';
import { textHighlightService, type IssueHighlight, type IssueType } from './textHighlightService';
import { useEditorStore } from '../stores/useEditorStore';
import { issueHighlightService } from './issueHighlightService';
import { issueMatchingService } from './issueMatchingService';

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

Quill.register('formats/known-word', KnownWordBlot);
Quill.register('formats/issue-needs-help', IssueNeedsHelpBlot);
Quill.register('formats/issue-indexing', IssueIndexingBlot);
Quill.register('formats/issue-new-word', IssueNewWordBlot);

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

class RTEServiceImpl {
  private registry = new Map<EditorKey, RTEInstance>();
  private offScreenParent: HTMLElement | null = null;

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
      formats: ['bold', 'italic', 'underline', 'color', 'background', 'known-word', 'issue-needs-help', 'issue-indexing', 'issue-new-word']
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

    // Add to window for debugging
    if (typeof window !== 'undefined') {
      if (!window.debugEditors) {
        window.debugEditors = {};
      }
      window.debugEditors[key] = quill;
      console.log(`Added editor "${key}" to window.debugEditors`);
    }

    return quill;
  }

  attach(key: EditorKey, hostElement: HTMLElement): void {
    const instance = this.registry.get(key);
    if (!instance) {
      throw new Error(`RTE instance not found for key: ${key}`);
    }

    // Remove from current parent (if any)
    if (instance.container.parentNode) {
      instance.container.parentNode.removeChild(instance.container);
    }

    // Attach to new host
    hostElement.appendChild(instance.container);

    // Set readonly state based on config
    if (instance.config.readonly) {
      instance.quill.disable();
    } else {
      instance.quill.enable();
    }
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
    
    this.getOffScreenParent().appendChild(instance.container);
  }

  destroy(key: EditorKey): void {
    const instance = this.registry.get(key);
    if (!instance) {
      return;
    }

    // Clean up event listeners - Quill will handle cleanup when DOM element is removed

    // Remove from DOM
    if (instance.container.parentNode) {
      instance.container.parentNode.removeChild(instance.container);
    }

    // Remove from registry
    this.registry.delete(key);
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
    instance.quill.on('text-change', (_delta: QuillDelta, _oldDelta: QuillDelta, source: string) => {
      // Only trigger callback for user-initiated changes, not API changes
      if (source === 'user') {
        const plainText = instance.quill.getText().trim();
        callback(plainText);
      }
    });
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
    const tokenPattern = /([\p{L}\p{N}_-]+)/u;
    const tokens = text.split(tokenPattern);
    let currentIndex = 0;
    
    // Create issue text lookup for efficient matching
    const issueTextMap = new Map(issues.map(issue => [issue.text.trim().toLowerCase(), { id: issue.id, type: issue.type }]));
    
    for (const token of tokens) {
      if (tokenPattern.test(token)) {
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

    // Clear any existing issue formatting first
    ['issue-needs-help', 'issue-indexing', 'issue-new-word'].forEach(format => {
      instance.quill.formatText(0, text.length, format, false, 'api');
    });

    // Find issue matches
    const matches = this.findIssueMatches(text, issues);
    
    // Apply specific issue formatting based on type
    matches.forEach(({ index, length, type, id }) => {
      const formatName = `issue-${type}`;
      instance.quill.formatText(index, length, formatName, id, 'api');
    });
  }

  // Apply both known words and issue formatting (issues take priority)
  applyHighlighting(key: EditorKey, options: { knownWords?: string[]; issues?: IssueHighlight[] }): void {
    const instance = this.registry.get(key);
    if (!instance) {
      return;
    }

    const text = instance.quill.getText();
    if (!text) return;

    const { knownWords = [], issues = [] } = options;

    // Clear all existing formatting first
    instance.quill.formatText(0, text.length, 'known-word', false, 'api');
    ['issue-needs-help', 'issue-indexing', 'issue-new-word'].forEach(format => {
      instance.quill.formatText(0, text.length, format, false, 'api');
    });

    // Apply known words first
    if (knownWords.length > 0) {
      const knownWordsSet = new Set(knownWords);
      const knownWordMatches = textHighlightService.findMatches(text, knownWordsSet);
      knownWordMatches.forEach(({ index, length }) => {
        instance.quill.formatText(index, length, 'known-word', true, 'api');
      });
    }

    // Apply issues second (they will override known words where they overlap)
    if (issues.length > 0) {
      const issueMatches = this.findIssueMatches(text, issues);
      issueMatches.forEach(({ index, length, type, id }) => {
        // Clear known-word formatting at this position first, then apply issue formatting
        instance.quill.formatText(index, length, 'known-word', false, 'api');
        const formatName = `issue-${type}`;
        instance.quill.formatText(index, length, formatName, id, 'api');
      });
    }
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
    const issueFormats = ['issue-needs-help', 'issue-indexing', 'issue-new-word'] as const;
    
    for (const formatName of issueFormats) {
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

    // Use the same tokenization pattern as our text highlighting
    const tokenPattern = /([\p{L}\p{N}_-]+)/u;
    
    // Find word boundaries around the index
    let start = index;
    let end = index;
    
    // Move start backwards to find word beginning
    while (start > 0 && tokenPattern.test(text[start - 1])) {
      start--;
    }
    
    // Move end forwards to find word end
    while (end < text.length && tokenPattern.test(text[end])) {
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
    
    // Clean up off-screen parent
    if (this.offScreenParent && this.offScreenParent.parentNode) {
      this.offScreenParent.parentNode.removeChild(this.offScreenParent);
      this.offScreenParent = null;
    }
  }

  /**
   * Update issue highlighting for a specific region's editor
   */
  updateIssueHighlighting(regionId: string): void {
    const editorKey = `${regionId}:main` as EditorKey;
    const instance = this.registry.get(editorKey);
    if (!instance) {
      return;
    }

    // Get current state from store
    const state = useEditorStore.getState();
    const knownWords = Array.from(state.knownWords);
    const issues = typeof state.getIssuesForRegion === 'function' 
      ? state.getIssuesForRegion(regionId) 
      : [];

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

    // Re-apply highlighting
    this.applyHighlighting(editorKey, {
      knownWords,
      issues: issueHighlights
    });
  }
}

export const rteService = new RTEServiceImpl(); 