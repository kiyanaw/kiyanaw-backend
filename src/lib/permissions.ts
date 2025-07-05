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
    transcription.author === user.username ||
    (transcription.editors?.includes(user.username) ?? false)
  );
};

export const isAuthor = (
  transcription: TranscriptionData | null,
  user: User | null
): boolean => {
  if (!transcription || !user) return false;

  return transcription.author === user.username;
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
