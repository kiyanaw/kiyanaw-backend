import { ModelInit, MutableModel } from "@aws-amplify/datastore";
// @ts-ignore
import { LazyLoading, LazyLoadingDisabled, AsyncCollection, AsyncItem } from "@aws-amplify/datastore";

type TranscriptionMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type RegionMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type IssueMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type ContributorMetaData = {
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
  readonly isPublished?: boolean | null;
  readonly disableAnalyzer?: boolean | null;
  readonly editors?: (string | null)[] | null;
  readonly viewers?: (string | null)[] | null;
  readonly editorGroups?: (string | null)[] | null;
  readonly viewerGroups?: (string | null)[] | null;
  readonly regions?: (Region | null)[] | null;
  readonly issueList?: (Issue | null)[] | null;
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
  readonly isPublished?: boolean | null;
  readonly disableAnalyzer?: boolean | null;
  readonly editors?: (string | null)[] | null;
  readonly viewers?: (string | null)[] | null;
  readonly editorGroups?: (string | null)[] | null;
  readonly viewerGroups?: (string | null)[] | null;
  readonly regions: AsyncCollection<Region>;
  readonly issueList: AsyncCollection<Issue>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type Transcription = LazyLoading extends LazyLoadingDisabled ? EagerTranscription : LazyTranscription

export declare const Transcription: (new (init: ModelInit<Transcription, TranscriptionMetaData>) => Transcription) & {
  copyOf(source: Transcription, mutator: (draft: MutableModel<Transcription, TranscriptionMetaData>) => MutableModel<Transcription, TranscriptionMetaData> | void): Transcription;
}

type EagerRegion = {
  readonly id: string;
  readonly start: number;
  readonly end: number;
  readonly regionText?: string | null;
  readonly regionAnalysis?: string | null;
  readonly isNote?: boolean | null;
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
  readonly regionText?: string | null;
  readonly regionAnalysis?: string | null;
  readonly isNote?: boolean | null;
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

type EagerIssue = {
  readonly id: string;
  readonly text: string;
  readonly owner: string;
  readonly index: number;
  readonly resolved?: boolean | null;
  readonly type: string;
  readonly comments?: string | null;
  readonly regionId: string;
  readonly transcription: Transcription;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyIssue = {
  readonly id: string;
  readonly text: string;
  readonly owner: string;
  readonly index: number;
  readonly resolved?: boolean | null;
  readonly type: string;
  readonly comments?: string | null;
  readonly regionId: string;
  readonly transcription: AsyncItem<Transcription>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type Issue = LazyLoading extends LazyLoadingDisabled ? EagerIssue : LazyIssue

export declare const Issue: (new (init: ModelInit<Issue, IssueMetaData>) => Issue) & {
  copyOf(source: Issue, mutator: (draft: MutableModel<Issue, IssueMetaData>) => MutableModel<Issue, IssueMetaData> | void): Issue;
}

type EagerContributor = {
  readonly id: string;
  readonly name?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyContributor = {
  readonly id: string;
  readonly name?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type Contributor = LazyLoading extends LazyLoadingDisabled ? EagerContributor : LazyContributor

export declare const Contributor: (new (init: ModelInit<Contributor, ContributorMetaData>) => Contributor) & {
  copyOf(source: Contributor, mutator: (draft: MutableModel<Contributor, ContributorMetaData>) => MutableModel<Contributor, ContributorMetaData> | void): Contributor;
}