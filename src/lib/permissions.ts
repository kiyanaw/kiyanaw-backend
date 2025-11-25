// Permission utility functions to replace Vuex selectors

import { type TranscriptionData } from "../services/adt";

export interface User {
  username: string;
  userId: string;
}

export const canEdit = (
  transcription: TranscriptionData | null,
  user: User | null
): boolean => {
  if (!transcription || !user) return false;

  return (
    transcription.author === user.userId ||
    (transcription.editors?.includes(user.userId) ?? false)
  );
};

export const isAuthor = (
  transcription: TranscriptionData | null,
  user: User | null
): boolean => {
  if (!transcription || !user) return false;

  return transcription.author === user.userId;
};

export const canDelete = (
  transcription: TranscriptionData | null,
  user: User | null
): boolean => {
  return isAuthor(transcription, user);
};

export const canAddEditor = (
  transcription: TranscriptionData | null,
  user: User | null
): boolean => {
  return isAuthor(transcription, user);
};

export const canRemoveEditor = (
  transcription: TranscriptionData | null,
  user: User | null,
  editorToRemove: string
): boolean => {
  if (!isAuthor(transcription, user)) return false;

  // Cannot remove the author
  return editorToRemove !== transcription?.author;
};

export const canComment = (
  transcription: TranscriptionData | null,
  user: User | null
): boolean => {
  if (!transcription || !user) return false;

  // Authors and editors can always comment
  const isOwnerOrEditor = (
    transcription.author === user.userId ||
    (transcription.editors?.includes(user.userId) ?? false)
  );
  
  if (isOwnerOrEditor) return true;

  // Viewers can only comment if publicIssues is enabled
  const isViewer = transcription.viewers?.includes(user.userId) ?? false;
  
  return isViewer && (transcription.publicIssues ?? false);
};

export const canDeleteComment = (
  commentAuthor: string,
  transcription: TranscriptionData | null,
  user: User | null
): boolean => {
  if (!user) return false;

  // Comment author can delete their own comment
  if (commentAuthor === user.userId) return true;

  // Transcription author can delete any comment
  return isAuthor(transcription, user);
};

export const canDeleteIssue = (
  issueOwnerId: string,
  transcription: TranscriptionData | null,
  user: User | null
): boolean => {
  if (!user) return false;

  // Must be able to edit the transcription AND be the issue owner
  return canEdit(transcription, user) && user.userId === issueOwnerId;
};

export const canResolveIssue = (
  transcription: TranscriptionData | null,
  user: User | null
): boolean => {
  // Can resolve if user can edit the transcription
  return canEdit(transcription, user);
};
