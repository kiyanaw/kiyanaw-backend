import { Quill } from 'react-quill';
import { ISSUE_TYPE_VALUES } from './adt';
import type { BlotInstance } from './rteService.interfaces';

// Derive issue format names from centralized ISSUE_TYPE_VALUES
export const ISSUE_FORMATS = ISSUE_TYPE_VALUES.map(type => `issue-${type}` as const);

// Get the Inline blot class from Quill
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Inline = Quill.import('blots/inline') as any;

export class KnownWordBlot extends Inline implements BlotInstance {
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

export class IssueNeedsHelpBlot extends Inline implements BlotInstance {
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

export class IssueIndexingBlot extends Inline implements BlotInstance {
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

export class IssueNewWordBlot extends Inline implements BlotInstance {
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

export class AmbiguousWordBlot extends Inline implements BlotInstance {
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

export class SpellingSuggestionBlot extends Inline implements BlotInstance {
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

/**
 * Register all custom blots with Quill.
 * Must be called before creating any Quill instances.
 */
export function registerBlots(): void {
  Quill.register('formats/known-word', KnownWordBlot);
  Quill.register('formats/issue-needs-help', IssueNeedsHelpBlot);
  Quill.register('formats/issue-indexing', IssueIndexingBlot);
  Quill.register('formats/issue-new-word', IssueNewWordBlot);
  Quill.register('formats/ambiguous-word', AmbiguousWordBlot);
  Quill.register('formats/spelling-suggestion', SpellingSuggestionBlot);
}
