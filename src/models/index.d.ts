import { ModelInit, MutableModel } from "@aws-amplify/datastore";
// @ts-ignore
import { LazyLoading, LazyLoadingDisabled, AsyncCollection, AsyncItem } from "@aws-amplify/datastore";

type TranscriptionMetaData = {
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

type UserCursorMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type PointerMetaData = {
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
  readonly contributors: AsyncCollection<TranscriptionContributor>;
  readonly regions: AsyncCollection<Region>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type Transcription = LazyLoading extends LazyLoadingDisabled ? EagerTranscription : LazyTranscription

export declare const Transcription: (new (init: ModelInit<Transcription, TranscriptionMetaData>) => Transcription) & {
  copyOf(source: Transcription, mutator: (draft: MutableModel<Transcription, TranscriptionMetaData>) => MutableModel<Transcription, TranscriptionMetaData> | void): Transcription;
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

type EagerUserCursor = {
  readonly id: string;
  readonly transcription: string;
  readonly region: string;
  readonly cursor: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyUserCursor = {
  readonly id: string;
  readonly transcription: string;
  readonly region: string;
  readonly cursor: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type UserCursor = LazyLoading extends LazyLoadingDisabled ? EagerUserCursor : LazyUserCursor

export declare const UserCursor: (new (init: ModelInit<UserCursor, UserCursorMetaData>) => UserCursor) & {
  copyOf(source: UserCursor, mutator: (draft: MutableModel<UserCursor, UserCursorMetaData>) => MutableModel<UserCursor, UserCursorMetaData> | void): UserCursor;
}

type EagerPointer = {
  readonly id: string;
  readonly transcription: string;
  readonly region: string;
  readonly cursor: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyPointer = {
  readonly id: string;
  readonly transcription: string;
  readonly region: string;
  readonly cursor: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type Pointer = LazyLoading extends LazyLoadingDisabled ? EagerPointer : LazyPointer

export declare const Pointer: (new (init: ModelInit<Pointer, PointerMetaData>) => Pointer) & {
  copyOf(source: Pointer, mutator: (draft: MutableModel<Pointer, PointerMetaData>) => MutableModel<Pointer, PointerMetaData> | void): Pointer;
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