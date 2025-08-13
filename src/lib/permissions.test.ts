import {
  canEdit,
  isAuthor,
  canDelete,
  canAddEditor,
  canRemoveEditor,
  canComment,
  canDeleteComment,
  canDeleteIssue,
  canResolveIssue,
  type User
} from './permissions';
import type { TranscriptionData } from '../services/adt';

describe('permissions', () => {
  const user: User = {
    username: 'testuser',
    userId: 'user-123'
  };

  const otherUser: User = {
    username: 'otheruser',
    userId: 'user-456'
  };

  const transcription: TranscriptionData = {
    id: 'trans-123',
    title: 'Test Transcription',
    author: 'user-123',
    authorFriendly: 'Test User',
    type: 'transcription',
    source: 'test-source',
    userLastUpdated: 'user-123',
    length: 120,
    editors: ['user-789'],
    viewers: ['user-999'],
    isPrivate: false
  };

  describe('canEdit', () => {
    it('should return true for author', () => {
      expect(canEdit(transcription, user)).toBe(true);
    });

    it('should return true for editor', () => {
      const editorUser: User = { username: 'editor', userId: 'user-789' };
      expect(canEdit(transcription, editorUser)).toBe(true);
    });

    it('should return false for other users', () => {
      expect(canEdit(transcription, otherUser)).toBe(false);
    });

    it('should return false when transcription is null', () => {
      expect(canEdit(null, user)).toBe(false);
    });

    it('should return false when user is null', () => {
      expect(canEdit(transcription, null)).toBe(false);
    });

    it('should handle transcription without editors array', () => {
      const transcriptionWithoutEditors = { ...transcription, editors: undefined };
      expect(canEdit(transcriptionWithoutEditors, otherUser)).toBe(false);
    });
  });

  describe('isAuthor', () => {
    it('should return true for author', () => {
      expect(isAuthor(transcription, user)).toBe(true);
    });

    it('should return false for non-author', () => {
      expect(isAuthor(transcription, otherUser)).toBe(false);
    });

    it('should return false when transcription is null', () => {
      expect(isAuthor(null, user)).toBe(false);
    });

    it('should return false when user is null', () => {
      expect(isAuthor(transcription, null)).toBe(false);
    });
  });

  describe('canDelete', () => {
    it('should return true for author', () => {
      expect(canDelete(transcription, user)).toBe(true);
    });

    it('should return false for non-author', () => {
      expect(canDelete(transcription, otherUser)).toBe(false);
    });

    it('should return false when transcription is null', () => {
      expect(canDelete(null, user)).toBe(false);
    });

    it('should return false when user is null', () => {
      expect(canDelete(transcription, null)).toBe(false);
    });
  });

  describe('canAddEditor', () => {
    it('should return true for author', () => {
      expect(canAddEditor(transcription, user)).toBe(true);
    });

    it('should return false for non-author', () => {
      expect(canAddEditor(transcription, otherUser)).toBe(false);
    });

    it('should return false when transcription is null', () => {
      expect(canAddEditor(null, user)).toBe(false);
    });

    it('should return false when user is null', () => {
      expect(canAddEditor(transcription, null)).toBe(false);
    });
  });

  describe('canRemoveEditor', () => {
    it('should return true for author removing an editor', () => {
      expect(canRemoveEditor(transcription, user, 'user-789')).toBe(true);
    });

    it('should return false for author trying to remove themselves', () => {
      expect(canRemoveEditor(transcription, user, 'user-123')).toBe(false);
    });

    it('should return false for non-author', () => {
      expect(canRemoveEditor(transcription, otherUser, 'user-789')).toBe(false);
    });

    it('should return false when transcription is null', () => {
      expect(canRemoveEditor(null, user, 'user-789')).toBe(false);
    });

    it('should return false when user is null', () => {
      expect(canRemoveEditor(transcription, null, 'user-789')).toBe(false);
    });
  });

  describe('canComment', () => {
    it('should return true for author', () => {
      expect(canComment(transcription, user)).toBe(true);
    });

    it('should return true for editor', () => {
      const editorUser: User = { username: 'editor', userId: 'user-789' };
      expect(canComment(transcription, editorUser)).toBe(true);
    });

    it('should return true for viewer', () => {
      const viewerUser: User = { username: 'viewer', userId: 'user-999' };
      expect(canComment(transcription, viewerUser)).toBe(true);
    });

    it('should return false for other users', () => {
      expect(canComment(transcription, otherUser)).toBe(false);
    });

    it('should return false when transcription is null', () => {
      expect(canComment(null, user)).toBe(false);
    });

    it('should return false when user is null', () => {
      expect(canComment(transcription, null)).toBe(false);
    });

    it('should handle transcription without editors array', () => {
      const transcriptionWithoutEditors = { ...transcription, editors: undefined };
      expect(canComment(transcriptionWithoutEditors, otherUser)).toBe(false);
    });

    it('should handle transcription without viewers array', () => {
      const transcriptionWithoutViewers = { ...transcription, viewers: undefined };
      const viewerUser: User = { username: 'viewer', userId: 'user-999' };
      expect(canComment(transcriptionWithoutViewers, viewerUser)).toBe(false);
    });
  });

  describe('canDeleteComment', () => {
    it('should return true for comment author', () => {
      expect(canDeleteComment('user-456', transcription, otherUser)).toBe(true);
    });

    it('should return true for transcription author', () => {
      expect(canDeleteComment('user-456', transcription, user)).toBe(true);
    });

    it('should return false for other users', () => {
      const randomUser: User = { username: 'random', userId: 'user-111' };
      expect(canDeleteComment('user-456', transcription, randomUser)).toBe(false);
    });

    it('should return false when user is null', () => {
      expect(canDeleteComment('user-456', transcription, null)).toBe(false);
    });
  });

  describe('canDeleteIssue', () => {
    it('should return true when user can edit transcription and is issue owner', () => {
      expect(canDeleteIssue('user-123', transcription, user)).toBe(true);
    });

    it('should return true when editor is issue owner', () => {
      const editorUser: User = { username: 'editor', userId: 'user-789' };
      expect(canDeleteIssue('user-789', transcription, editorUser)).toBe(true);
    });

    it('should return false when user can edit but is not issue owner', () => {
      expect(canDeleteIssue('user-456', transcription, user)).toBe(false);
    });

    it('should return false when user is issue owner but cannot edit', () => {
      expect(canDeleteIssue('user-456', transcription, otherUser)).toBe(false);
    });

    it('should return false when transcription is null', () => {
      expect(canDeleteIssue('user-123', null, user)).toBe(false);
    });

    it('should return false when user is null', () => {
      expect(canDeleteIssue('user-123', transcription, null)).toBe(false);
    });
  });

  describe('canResolveIssue', () => {
    it('should return true when user can edit transcription', () => {
      expect(canResolveIssue(transcription, user)).toBe(true);
    });

    it('should return true when user is editor', () => {
      const editorUser: User = { username: 'editor', userId: 'user-789' };
      expect(canResolveIssue(transcription, editorUser)).toBe(true);
    });

    it('should return false when user cannot edit transcription', () => {
      expect(canResolveIssue(transcription, otherUser)).toBe(false);
    });

    it('should return false when transcription is null', () => {
      expect(canResolveIssue(null, user)).toBe(false);
    });

    it('should return false when user is null', () => {
      expect(canResolveIssue(transcription, null)).toBe(false);
    });
  });
});
