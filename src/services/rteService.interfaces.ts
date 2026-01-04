import { Quill } from 'react-quill';

// Delta types
export interface DeltaInstance {
  ops: Array<Record<string, unknown>>;
  retain(count: number, attributes?: Record<string, unknown>): DeltaInstance;
}

export type DeltaConstructor = {
  new (): DeltaInstance;
};

// Quill-related interfaces
export interface QuillModulesConfig extends Record<string, unknown> {
  toolbar?: boolean | object;
  cursors?: {
    hideDelayMs?: number;
    transformOnTextChange?: boolean;
  };
  clipboard?: {
    matchVisual?: boolean;
  };
}

export interface QuillDelta {
  ops?: Array<{
    insert?: string;
    delete?: number;
    retain?: number;
    attributes?: Record<string, unknown>;
  }>;
}

// Quill instance type - using the constructor type
export type QuillInstance = InstanceType<typeof Quill>;

// Extend window for debugging
declare global {
  interface Window {
    debugEditors?: Record<string, QuillInstance>;
  }
}

// Blot interface for custom format implementations
export interface BlotInstance {
  domNode: HTMLElement;
  format(name: string, value: boolean | string): void;
}

// Editor key type for identifying editors
export type EditorKey = `${string}:${'main' | 'translation'}`;

// RTE configuration
export interface RTEConfig {
  readonly?: boolean;
  placeholder?: string;
  theme?: 'snow' | 'bubble';
  formats?: string[];
  modules?: QuillModulesConfig;
}

// Internal RTE instance representation
export interface RTEInstance {
  quill: QuillInstance;
  container: HTMLElement;
  config: RTEConfig;
  textChangeCallback?: (text: string) => void;
}

// Debug info for tracking editor state
export interface EditorDebugInfo {
  version: number;
  lastEvent: string;
  lastTimestamp: number;
  lastDetails?: Record<string, unknown>;
}
