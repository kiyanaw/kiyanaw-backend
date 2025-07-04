import { useAuthStore, type AuthUser } from '../stores/useAuthStore';

export const currentUser = (): AuthUser | null => {
  return useAuthStore.getState().user;
};

interface TranscriptionForPermissions {
  id: string;
  author: string;
  editors?: (string | null)[] | null;
  // TODO: Add viewers and group fields when needed
}

export const canEditTranscription = (transcription: TranscriptionForPermissions | null): boolean => {
  const user = currentUser();
  
  if (!transcription || !user) {
    return false;
  }

  // Check if user is the author
  if (transcription.author === user.username) {
    return true;
  }

  // Check if user is in the editors array
  if (transcription.editors && Array.isArray(transcription.editors)) {
    if (transcription.editors.indexOf(user.username) !== -1) {
      return true;
    }
  }

  // TODO: Check if user is in the "Admins" group
  // This requires accessing cognito:groups from the JWT token
  // For now, we'll skip this check

  return false;
};