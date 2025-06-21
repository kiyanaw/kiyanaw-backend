import { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Import quill-cursors for collaborative editing
import QuillCursors from 'quill-cursors';
import { textHighlightService } from './textHighlightService';

// Extend window for debugging
declare global {
  interface Window {
    debugEditors?: Record<string, any>;
  }
}
Quill.register('modules/cursors', QuillCursors);

// Register custom formats with Quill
const Inline = Quill.import('blots/inline') as any;

class KnownWordBlot extends Inline {
  static blotName = 'known-word';
  static tagName = 'span';
  static className = 'known-word';
  
  static create(value: any) {
    const node = super.create();
    node.setAttribute('class', 'known-word');
    return node;
  }
  
  static formats(node: any) {
    return node.getAttribute('class') === 'known-word';
  }
  
  format(name: string, value: any) {
    if (name !== 'known-word' || !value) {
      super.format(name, value);
    } else {
      this.domNode.setAttribute('class', 'known-word');
    }
  }
}

Quill.register('formats/known-word', KnownWordBlot);

// Custom formats are now defined in src/index.css

export type EditorKey = `${string}:${'main' | 'translation'}`;

export interface RTEConfig {
  readonly?: boolean;
  placeholder?: string;
  theme?: 'snow' | 'bubble';
  formats?: string[];
  modules?: any;
}

interface RTEInstance {
  quill: any; // Quill instance
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

  createOrGet(key: EditorKey, config: RTEConfig): any {
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
      formats: ['bold', 'italic', 'underline', 'color', 'background', 'known-word']
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

    // Clean up event listeners
    // Note: Quill doesn't have a standard off() method, but we can prepare for it
    if (typeof instance.quill.off === 'function') {
      instance.quill.off();
    }

    // Remove from DOM
    if (instance.container.parentNode) {
      instance.container.parentNode.removeChild(instance.container);
    }

    // Remove from registry
    this.registry.delete(key);
  }

  // Utility method to get quill instance (for direct manipulation if needed)
  getInstance(key: EditorKey): any | null {
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
    instance.quill.on('text-change', (delta: any, oldDelta: any, source: string) => {
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