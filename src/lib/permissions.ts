// Permission utility functions to replace Vuex selectors

export interface User {
  username: string;
  userId: string;
}

export interface Transcription {
  id: string;
  author: string;
  editors: string[];
  [key: string]: any;
}

export const canEdit = (
  transcription: Transcription | null,
  user: User | null
): boolean => {
  if (!transcription || !user) return false;

  return (
    transcription.author === user.username ||
    transcription.editors.includes(user.username)
  );
};

export const isAuthor = (
  transcription: Transcription | null,
  user: User | null
): boolean => {
  if (!transcription || !user) return false;

  return transcription.author === user.username;
};

export const canDelete = (
  transcription: Transcription | null,
  user: User | null
): boolean => {
  return isAuthor(transcription, user);
};

export const canAddEditor = (
  transcription: Transcription | null,
  user: User | null
): boolean => {
  return isAuthor(transcription, user);
};

export const canRemoveEditor = (
  transcription: Transcription | null,
  user: User | null,
  editorToRemove: string
): boolean => {
  if (!isAuthor(transcription, user)) return false;

  // Cannot remove the author
  return editorToRemove !== transcription?.author;
};
