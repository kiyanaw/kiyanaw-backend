import { ModelInit, MutableModel } from "@aws-amplify/datastore";
// @ts-ignore
import { LazyLoading, LazyLoadingDisabled, AsyncCollection, AsyncItem } from "@aws-amplify/datastore";

type TranscriptionMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type TranscriptionEditorMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type EditorMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type ContributorMetaData = {
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

type TranscriptionContributorMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type EagerTranscription = {
  readonly id: string;
  readonly author: string;
  readonly coverage?: number | null;
  readonly dateLastUpdated: string;
  readonly userLastUpdated?: string | null;
  readonly length?: number | null;
  readonly issues?: string | null;
  readonly comments?: string | null;
  readonly tags?: string | null;
  readonly source?: string | null;
  readonly index?: string | null;
  readonly title: string;
  readonly type: string;
  readonly isPrivate?: boolean | null;
  readonly disableAnalyzer?: boolean | null;
  readonly editor?: (TranscriptionEditor | null)[] | null;
  readonly contributors?: (TranscriptionContributor | null)[] | null;
  readonly regions?: (Region | null)[] | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyTranscription = {
  readonly id: string;
  readonly author: string;
  readonly coverage?: number | null;
  readonly dateLastUpdated: string;
  readonly userLastUpdated?: string | null;
  readonly length?: number | null;
  readonly issues?: string | null;
  readonly comments?: string | null;
  readonly tags?: string | null;
  readonly source?: string | null;
  readonly index?: string | null;
  readonly title: string;
  readonly type: string;
  readonly isPrivate?: boolean | null;
  readonly disableAnalyzer?: boolean | null;
  readonly editor: AsyncCollection<TranscriptionEditor>;
  readonly contributors: AsyncCollection<TranscriptionContributor>;
  readonly regions: AsyncCollection<Region>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type Transcription = LazyLoading extends LazyLoadingDisabled ? EagerTranscription : LazyTranscription

export declare const Transcription: (new (init: ModelInit<Transcription, TranscriptionMetaData>) => Transcription) & {
  copyOf(source: Transcription, mutator: (draft: MutableModel<Transcription, TranscriptionMetaData>) => MutableModel<Transcription, TranscriptionMetaData> | void): Transcription;
}

type EagerTranscriptionEditor = {
  readonly id: string;
  readonly transcription: Transcription;
  readonly editor: Editor;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyTranscriptionEditor = {
  readonly id: string;
  readonly transcription: AsyncItem<Transcription>;
  readonly editor: AsyncItem<Editor>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type TranscriptionEditor = LazyLoading extends LazyLoadingDisabled ? EagerTranscriptionEditor : LazyTranscriptionEditor

export declare const TranscriptionEditor: (new (init: ModelInit<TranscriptionEditor, TranscriptionEditorMetaData>) => TranscriptionEditor) & {
  copyOf(source: TranscriptionEditor, mutator: (draft: MutableModel<TranscriptionEditor, TranscriptionEditorMetaData>) => MutableModel<TranscriptionEditor, TranscriptionEditorMetaData> | void): TranscriptionEditor;
}

type EagerEditor = {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly transcriptions?: (TranscriptionEditor | null)[] | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyEditor = {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly transcriptions: AsyncCollection<TranscriptionEditor>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type Editor = LazyLoading extends LazyLoadingDisabled ? EagerEditor : LazyEditor

export declare const Editor: (new (init: ModelInit<Editor, EditorMetaData>) => Editor) & {
  copyOf(source: Editor, mutator: (draft: MutableModel<Editor, EditorMetaData>) => MutableModel<Editor, EditorMetaData> | void): Editor;
}

type EagerContributor = {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly transcriptions?: (TranscriptionContributor | null)[] | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyContributor = {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly transcriptions: AsyncCollection<TranscriptionContributor>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type Contributor = LazyLoading extends LazyLoadingDisabled ? EagerContributor : LazyContributor

export declare const Contributor: (new (init: ModelInit<Contributor, ContributorMetaData>) => Contributor) & {
  copyOf(source: Contributor, mutator: (draft: MutableModel<Contributor, ContributorMetaData>) => MutableModel<Contributor, ContributorMetaData> | void): Contributor;
}

type EagerRegion = {
  readonly id: string;
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly issues?: string | null;
  readonly isNote?: boolean | null;
  readonly comments?: string | null;
  readonly translation?: string | null;
  readonly dateLastUpdated: string;
  readonly userLastUpdated: string;
  readonly transcription: Transcription;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyRegion = {
  readonly id: string;
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly issues?: string | null;
  readonly isNote?: boolean | null;
  readonly comments?: string | null;
  readonly translation?: string | null;
  readonly dateLastUpdated: string;
  readonly userLastUpdated: string;
  readonly transcription: AsyncItem<Transcription>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type Region = LazyLoading extends LazyLoadingDisabled ? EagerRegion : LazyRegion

export declare const Region: (new (init: ModelInit<Region, RegionMetaData>) => Region) & {
  copyOf(source: Region, mutator: (draft: MutableModel<Region, RegionMetaData>) => MutableModel<Region, RegionMetaData> | void): Region;
}

type EagerCursor = {
  readonly id: string;
  readonly user: string;
  readonly cursor: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyCursor = {
  readonly id: string;
  readonly user: string;
  readonly cursor: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type Cursor = LazyLoading extends LazyLoadingDisabled ? EagerCursor : LazyCursor

export declare const Cursor: (new (init: ModelInit<Cursor, CursorMetaData>) => Cursor) & {
  copyOf(source: Cursor, mutator: (draft: MutableModel<Cursor, CursorMetaData>) => MutableModel<Cursor, CursorMetaData> | void): Cursor;
}

type EagerRegionLock = {
  readonly id: string;
  readonly transcriptionId: string;
  readonly deleteTime: number;
  readonly user: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyRegionLock = {
  readonly id: string;
  readonly transcriptionId: string;
  readonly deleteTime: number;
  readonly user: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type RegionLock = LazyLoading extends LazyLoadingDisabled ? EagerRegionLock : LazyRegionLock

export declare const RegionLock: (new (init: ModelInit<RegionLock, RegionLockMetaData>) => RegionLock) & {
  copyOf(source: RegionLock, mutator: (draft: MutableModel<RegionLock, RegionLockMetaData>) => MutableModel<RegionLock, RegionLockMetaData> | void): RegionLock;
}

type EagerTranscriptionContributor = {
  readonly id: string;
  readonly transcription: Transcription;
  readonly contributor: Contributor;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyTranscriptionContributor = {
  readonly id: string;
  readonly transcription: AsyncItem<Transcription>;
  readonly contributor: AsyncItem<Contributor>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type TranscriptionContributor = LazyLoading extends LazyLoadingDisabled ? EagerTranscriptionContributor : LazyTranscriptionContributor

export declare const TranscriptionContributor: (new (init: ModelInit<TranscriptionContributor, TranscriptionContributorMetaData>) => TranscriptionContributor) & {
  copyOf(source: TranscriptionContributor, mutator: (draft: MutableModel<TranscriptionContributor, TranscriptionContributorMetaData>) => MutableModel<TranscriptionContributor, TranscriptionContributorMetaData> | void): TranscriptionContributor;
}