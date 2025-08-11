import { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Import quill-cursors for collaborative editing
import QuillCursors from 'quill-cursors';
import { textHighlightService, type IssueHighlight, type IssueType } from './textHighlightService';

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
  
  static create() {
    const node = super.create();
    node.setAttribute('class', 'issue-needs-help');
    return node;
  }
  
  static formats(node: HTMLElement) {
    return node.getAttribute('class') === 'issue-needs-help';
  }
  
  format(name: string, value: boolean | string) {
    if (name !== 'issue-needs-help' || !value) {
      super.format(name, value);
    } else {
      this.domNode.setAttribute('class', 'issue-needs-help');
    }
  }
}

class IssueIndexingBlot extends Inline implements BlotInstance {
  declare domNode: HTMLElement;
  
  static blotName = 'issue-indexing';
  static tagName = 'span';
  static className = 'issue-indexing';
  
  static create() {
    const node = super.create();
    node.setAttribute('class', 'issue-indexing');
    return node;
  }
  
  static formats(node: HTMLElement) {
    return node.getAttribute('class') === 'issue-indexing';
  }
  
  format(name: string, value: boolean | string) {
    if (name !== 'issue-indexing' || !value) {
      super.format(name, value);
    } else {
      this.domNode.setAttribute('class', 'issue-indexing');
    }
  }
}

class IssueNewWordBlot extends Inline implements BlotInstance {
  declare domNode: HTMLElement;
  
  static blotName = 'issue-new-word';
  static tagName = 'span';
  static className = 'issue-new-word';
  
  static create() {
    const node = super.create();
    node.setAttribute('class', 'issue-new-word');
    return node;
  }
  
  static formats(node: HTMLElement) {
    return node.getAttribute('class') === 'issue-new-word';
  }
  
  format(name: string, value: boolean | string) {
    if (name !== 'issue-new-word' || !value) {
      super.format(name, value);
    } else {
      this.domNode.setAttribute('class', 'issue-new-word');
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
    const issueTextMap = new Map(issues.map(issue => [issue.text.toLowerCase(), { id: issue.id, type: issue.type }]));
    
    for (const token of tokens) {
      if (tokenPattern.test(token)) {
        const lowerToken = token.toLowerCase();
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
    matches.forEach(({ index, length, type }) => {
      const formatName = `issue-${type}`;
      instance.quill.formatText(index, length, formatName, true, 'api');
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
      issueMatches.forEach(({ index, length, type }) => {
        // Clear known-word formatting at this position first, then apply issue formatting
        instance.quill.formatText(index, length, 'known-word', false, 'api');
        const formatName = `issue-${type}`;
        instance.quill.formatText(index, length, formatName, true, 'api');
      });
    }
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
}

export const rteService = new RTEServiceImpl(); 