import { useAuthStore, type AuthUser } from '../stores/useAuthStore';

export const currentUser = (): AuthUser | null => {
  return useAuthStore.getState().user;
};

export const currentUserFriendly = (): string | null => {
  const user = currentUser();
  if (!user?.username) {
    return null;
  }
  return user.username.split('@')[0];
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

  // Check if user is the author (Amplify stores cognito:username which is the userId)
  if (transcription.author === user.userId) {
    return true;
  }

  // Check if user is in the editors array (also uses userIds)
  if (transcription.editors && Array.isArray(transcription.editors)) {
    if (transcription.editors.indexOf(user.userId) !== -1) {
      return true;
    }
  }

  // TODO: Check if user is in the "Admins" group
  // This requires accessing cognito:groups from the JWT token
  // For now, we'll skip this check

  return false;
};