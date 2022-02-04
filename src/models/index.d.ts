import { ModelInit, MutableModel, PersistentModelConstructor } from "@aws-amplify/datastore";





type TranscriptionMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type TranscriptionEditorMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type EditorMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type RegionMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type CursorMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type RegionLockMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

export declare class Transcription {
  readonly id: string;
  readonly author: string;
  readonly coverage?: number;
  readonly dateLastUpdated: string;
  readonly userLastUpdated?: string;
  readonly length?: number;
  readonly issues?: string;
  readonly comments?: string;
  readonly tags?: string;
  readonly source?: string;
  readonly test?: string;
  readonly index?: string;
  readonly title: string;
  readonly type: string;
  readonly isPrivate?: boolean;
  readonly disableAnalyzer?: boolean;
  readonly editor?: (TranscriptionEditor | null)[];
  readonly createdAt?: string;
  readonly updatedAt?: string;
  constructor(init: ModelInit<Transcription, TranscriptionMetaData>);
  static copyOf(source: Transcription, mutator: (draft: MutableModel<Transcription, TranscriptionMetaData>) => MutableModel<Transcription, TranscriptionMetaData> | void): Transcription;
}

export declare class TranscriptionEditor {
  readonly id: string;
  readonly transcription: Transcription;
  readonly editor: Editor;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  constructor(init: ModelInit<TranscriptionEditor, TranscriptionEditorMetaData>);
  static copyOf(source: TranscriptionEditor, mutator: (draft: MutableModel<TranscriptionEditor, TranscriptionEditorMetaData>) => MutableModel<TranscriptionEditor, TranscriptionEditorMetaData> | void): TranscriptionEditor;
}

export declare class Editor {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly transcriptions?: (TranscriptionEditor | null)[];
  readonly createdAt?: string;
  readonly updatedAt?: string;
  constructor(init: ModelInit<Editor, EditorMetaData>);
  static copyOf(source: Editor, mutator: (draft: MutableModel<Editor, EditorMetaData>) => MutableModel<Editor, EditorMetaData> | void): Editor;
}

export declare class Region {
  readonly id: string;
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly issues?: string;
  readonly isNote?: boolean;
  readonly comments?: string;
  readonly translation?: string;
  readonly dateLastUpdated: string;
  readonly userLastUpdated: string;
  readonly transcriptionId: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  constructor(init: ModelInit<Region, RegionMetaData>);
  static copyOf(source: Region, mutator: (draft: MutableModel<Region, RegionMetaData>) => MutableModel<Region, RegionMetaData> | void): Region;
}

export declare class Cursor {
  readonly id: string;
  readonly user: string;
  readonly cursor: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  constructor(init: ModelInit<Cursor, CursorMetaData>);
  static copyOf(source: Cursor, mutator: (draft: MutableModel<Cursor, CursorMetaData>) => MutableModel<Cursor, CursorMetaData> | void): Cursor;
}

export declare class RegionLock {
  readonly id: string;
  readonly transcriptionId: string;
  readonly deleteTime: number;
  readonly user: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  constructor(init: ModelInit<RegionLock, RegionLockMetaData>);
  static copyOf(source: RegionLock, mutator: (draft: MutableModel<RegionLock, RegionLockMetaData>) => MutableModel<RegionLock, RegionLockMetaData> | void): RegionLock;
}