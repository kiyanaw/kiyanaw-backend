import { useMemo } from 'react';
import { useAuth } from './useAuth';
import * as permissions from '../lib/permissions';

export const usePermissions = (transcription?: any) => {
  const { user } = useAuth();

  const permissionChecks = useMemo(() => {
    if (!transcription || !user) {
      return {
        canEdit: false,
        isAuthor: false,
        canDelete: false,
        canAddEditor: false,
        canRemoveEditor: () => false,
      };
    }

    return {
      canEdit: permissions.canEdit(transcription, user),
      isAuthor: permissions.isAuthor(transcription, user),
      canDelete: permissions.canDelete(transcription, user),
      canAddEditor: permissions.canAddEditor(transcription, user),
      canRemoveEditor: (editorToRemove: string) =>
        permissions.canRemoveEditor(transcription, user, editorToRemove),
    };
  }, [transcription, user]);

  return {
    user,
    ...permissionChecks,
  };
};
