import { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Import quill-cursors for collaborative editing
import QuillCursors from 'quill-cursors';
Quill.register('modules/cursors', QuillCursors);

// Custom formats registration
const customFormats = [
  'known-word',
  'ignore-word', 
  'issue-needs-help',
  'issue-indexing',
  'issue-new-word',
  'suggestion',
  'suggestion-known'
];

// Add CSS for custom formats
const customFormatStyles = `
  .known-word { color: #3b82f6; }
  .ignore-word { color: #777; }
  .issue-needs-help { background-color: #ffe6e6; }
  .issue-indexing { background-color: #fff9e6; }
  .issue-new-word { background-color: #e6f3ff; }
  .suggestion { text-decoration: underline; text-decoration-color: #f97316; }
  .suggestion-known { text-decoration: underline; text-decoration-color: #3b82f6; }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('quill-custom-formats')) {
  const style = document.createElement('style');
  style.id = 'quill-custom-formats';
  style.textContent = customFormatStyles;
  document.head.appendChild(style);
}

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
      formats: ['bold', 'italic', 'underline', 'color', 'background']
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

    // Store in registry
    const rteInstance: RTEInstance = {
      quill,
      container,
      config: finalConfig
    };
    
    this.registry.set(key, rteInstance);

    return quill;
  }

  attach(key: EditorKey, hostElement: HTMLElement): void {
    const instance = this.registry.get(key);
    if (!instance) {
      throw new Error(`RTE instance not found for key: ${key}`);
    }

    console.log(' - editor is readonly', key, instance.config.readonly)

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