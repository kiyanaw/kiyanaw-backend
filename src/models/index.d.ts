import { ModelInit, MutableModel } from "@aws-amplify/datastore";
// @ts-ignore
import { LazyLoading, LazyLoadingDisabled, AsyncItem, AsyncCollection } from "@aws-amplify/datastore";

type TranscriptionMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type RegionMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type IssueMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type InviteMetaData = {
  readOnlyFields: 'updatedAt';
}





type EagerTranscription = {
  readonly id: string;
  readonly author: string;
  readonly authorFriendly: string;
  readonly coverage?: number | null;
  readonly dateLastUpdated: string;
  readonly userLastUpdated: string;
  readonly length?: number | null;
  readonly issues?: string | null;
  readonly comments?: string | null;
  readonly commentCount?: number | null;
  readonly regionCount?: number | null;
  readonly issueCount?: number | null;
  readonly tags?: string | null;
  readonly source?: string | null;
  readonly media?: Media | null;
  readonly index?: string | null;
  readonly lang?: string | null;
  readonly title: string;
  readonly type: string;
  readonly isPrivate?: boolean | null;
  readonly isPublished?: boolean | null;
  readonly publicIssues?: boolean | null;
  readonly disableAnalyzer?: boolean | null;
  readonly editors?: (string | null)[] | null;
  readonly viewers?: (string | null)[] | null;
  readonly editorGroups?: (string | null)[] | null;
  readonly viewerGroups?: (string | null)[] | null;
  readonly regions?: (Region | null)[] | null;
  readonly issueList?: (Issue | null)[] | null;
  readonly relatedComments?: (Comment | null)[] | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyTranscription = {
  readonly id: string;
  readonly author: string;
  readonly authorFriendly: string;
  readonly coverage?: number | null;
  readonly dateLastUpdated: string;
  readonly userLastUpdated: string;
  readonly length?: number | null;
  readonly issues?: string | null;
  readonly comments?: string | null;
  readonly commentCount?: number | null;
  readonly regionCount?: number | null;
  readonly issueCount?: number | null;
  readonly tags?: string | null;
  readonly source?: string | null;
  readonly media: AsyncItem<Media | undefined>;
  readonly index?: string | null;
  readonly lang?: string | null;
  readonly title: string;
  readonly type: string;
  readonly isPrivate?: boolean | null;
  readonly isPublished?: boolean | null;
  readonly publicIssues?: boolean | null;
  readonly disableAnalyzer?: boolean | null;
  readonly editors?: (string | null)[] | null;
  readonly viewers?: (string | null)[] | null;
  readonly editorGroups?: (string | null)[] | null;
  readonly viewerGroups?: (string | null)[] | null;
  readonly regions: AsyncCollection<Region>;
  readonly issueList: AsyncCollection<Issue>;
  readonly relatedComments: AsyncCollection<Comment>;
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
  readonly commentCount?: number | null;
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
  readonly commentCount?: number | null;
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
  readonly ownerFriendly: string;
  readonly index: number;
  readonly resolved?: boolean | null;
  readonly type: string;
  readonly dateLastUpdated: string;
  readonly userLastUpdated: string;
  readonly comments?: string | null;
  readonly commentCount?: number | null;
  readonly regionId: string;
  readonly transcription: Transcription;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyIssue = {
  readonly id: string;
  readonly text: string;
  readonly owner: string;
  readonly ownerFriendly: string;
  readonly index: number;
  readonly resolved?: boolean | null;
  readonly type: string;
  readonly dateLastUpdated: string;
  readonly userLastUpdated: string;
  readonly comments?: string | null;
  readonly commentCount?: number | null;
  readonly regionId: string;
  readonly transcription: AsyncItem<Transcription>;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type Issue = LazyLoading extends LazyLoadingDisabled ? EagerIssue : LazyIssue

export declare const Issue: (new (init: ModelInit<Issue, IssueMetaData>) => Issue) & {
  copyOf(source: Issue, mutator: (draft: MutableModel<Issue, IssueMetaData>) => MutableModel<Issue, IssueMetaData> | void): Issue;
}

type EagerInvite = {
  readonly id: string;
  readonly email: string;
  readonly status: string;
  readonly permissionLevel: string;
  readonly expiresAt: string;
  readonly invitedBy: string;
  readonly invitedByFriendly: string;
  readonly createdAt: string;
  readonly acceptedAt?: string | null;
  readonly transcriptionId: string;
  readonly transcriptionTitle: string;
  readonly updatedAt?: string | null;
}

type LazyInvite = {
  readonly id: string;
  readonly email: string;
  readonly status: string;
  readonly permissionLevel: string;
  readonly expiresAt: string;
  readonly invitedBy: string;
  readonly invitedByFriendly: string;
  readonly createdAt: string;
  readonly acceptedAt?: string | null;
  readonly transcriptionId: string;
  readonly transcriptionTitle: string;
  readonly updatedAt?: string | null;
}

export declare type Invite = LazyLoading extends LazyLoadingDisabled ? EagerInvite : LazyInvite

export declare const Invite: (new (init: ModelInit<Invite, InviteMetaData>) => Invite) & {
  copyOf(source: Invite, mutator: (draft: MutableModel<Invite, InviteMetaData>) => MutableModel<Invite, InviteMetaData> | void): Invite;
}

type EagerComment = {
  readonly id: string;
  readonly text: string;
  readonly author: string;
  readonly authorFriendly: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly transcription: Transcription;
  readonly entityType: string;
  readonly entityId: string;
  readonly parentComment?: Comment | null;
  readonly replies?: (Comment | null)[] | null;
  readonly metadata?: string | null;
}

type LazyComment = {
  readonly id: string;
  readonly text: string;
  readonly author: string;
  readonly authorFriendly: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly transcription: AsyncItem<Transcription>;
  readonly entityType: string;
  readonly entityId: string;
  readonly parentComment: AsyncItem<Comment | undefined>;
  readonly replies: AsyncCollection<Comment>;
  readonly metadata?: string | null;
}

export declare type Comment = LazyLoading extends LazyLoadingDisabled ? EagerComment : LazyComment

export declare const Comment: (new (init: ModelInit<Comment>) => Comment) & {
  copyOf(source: Comment, mutator: (draft: MutableModel<Comment>) => MutableModel<Comment> | void): Comment;
}

type EagerMedia = {
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly owner: string;
  readonly status: string;
  readonly originalKey: string;
  readonly originalName?: string | null;
  readonly renditionKey?: string | null;
  readonly peaksKey?: string | null;
  readonly thumbnailKey?: string | null;
  readonly mimeType: string;
  readonly fileSize: number;
  readonly duration?: number | null;
  readonly tags?: (string | null)[] | null;
  readonly recordedAt?: string | null;
  readonly editors?: (string | null)[] | null;
  readonly viewers?: (string | null)[] | null;
  readonly editorGroups?: (string | null)[] | null;
  readonly viewerGroups?: (string | null)[] | null;
  readonly transcriptions?: (Transcription | null)[] | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

type LazyMedia = {
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly owner: string;
  readonly status: string;
  readonly originalKey: string;
  readonly originalName?: string | null;
  readonly renditionKey?: string | null;
  readonly peaksKey?: string | null;
  readonly thumbnailKey?: string | null;
  readonly mimeType: string;
  readonly fileSize: number;
  readonly duration?: number | null;
  readonly tags?: (string | null)[] | null;
  readonly recordedAt?: string | null;
  readonly editors?: (string | null)[] | null;
  readonly viewers?: (string | null)[] | null;
  readonly editorGroups?: (string | null)[] | null;
  readonly viewerGroups?: (string | null)[] | null;
  readonly transcriptions: AsyncCollection<Transcription>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export declare type Media = LazyLoading extends LazyLoadingDisabled ? EagerMedia : LazyMedia

export declare const Media: (new (init: ModelInit<Media>) => Media) & {
  copyOf(source: Media, mutator: (draft: MutableModel<Media>) => MutableModel<Media> | void): Media;
}