import { currentUser, canEditTranscription } from './userService';
import { useAuthStore } from '../stores/useAuthStore';

// Mock the store
jest.mock('../stores/useAuthStore', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

const mockedUseAuthStore = useAuthStore as jest.Mocked<typeof useAuthStore>;

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('currentUser', () => {
    it('should return user from store', () => {
      const mockUser = {
        username: 'testuser',
        userId: 'test-user-id',
        signInDetails: {},
      };

      mockedUseAuthStore.getState.mockReturnValue({
        user: mockUser,
        signedIn: true,
        setUser: jest.fn(),
      });

      const result = currentUser();

      expect(result).toEqual(mockUser);
    });

    it('should return null when no user in store', () => {
      mockedUseAuthStore.getState.mockReturnValue({
        user: null,
        signedIn: false,
        setUser: jest.fn(),
      });

      const result = currentUser();

      expect(result).toBeNull();
    });
  });

  describe('canEditTranscription', () => {
    const mockUser = {
      username: 'testuser',
      userId: 'test-user-id',
      signInDetails: {},
    };

    beforeEach(() => {
      mockedUseAuthStore.getState.mockReturnValue({
        user: mockUser,
        signedIn: true,
        setUser: jest.fn(),
      });
    });

    it('should return false when transcription is null', () => {
      const result = canEditTranscription(null);

      expect(result).toBe(false);
    });

    it('should return false when user is null', () => {
      mockedUseAuthStore.getState.mockReturnValue({
        user: null,
        signedIn: false,
        setUser: jest.fn(),
      });

      const transcription = {
        id: 'test-id',
        author: 'otheruser',
        editors: [],
      };

      const result = canEditTranscription(transcription);

      expect(result).toBe(false);
    });

    it('should return true when user is the author', () => {
      const transcription = {
        id: 'test-id',
        author: 'test-user-id',  // Uses userId not username
        editors: [],
      };

      const result = canEditTranscription(transcription);

      expect(result).toBe(true);
    });

    it('should return true when user is in editors array', () => {
      const transcription = {
        id: 'test-id',
        author: 'other-user-id',
        editors: ['test-user-id', 'another-editor-id'],  // Uses userIds not usernames
      };

      const result = canEditTranscription(transcription);

      expect(result).toBe(true);
    });

    it('should return false when user is not author or editor', () => {
      const transcription = {
        id: 'test-id',
        author: 'other-user-id',
        editors: ['different-user-id', 'another-editor-id'],
      };

      const result = canEditTranscription(transcription);

      expect(result).toBe(false);
    });

    it('should handle null editors array', () => {
      const transcription = {
        id: 'test-id',
        author: 'other-user-id',
        editors: null,
      };

      const result = canEditTranscription(transcription);

      expect(result).toBe(false);
    });

    it('should handle undefined editors array', () => {
      const transcription = {
        id: 'test-id',
        author: 'other-user-id',
        editors: undefined,
      };

      const result = canEditTranscription(transcription);

      expect(result).toBe(false);
    });

    it('should handle empty editors array', () => {
      const transcription = {
        id: 'test-id',
        author: 'other-user-id',
        editors: [],
      };

      const result = canEditTranscription(transcription);

      expect(result).toBe(false);
    });

    it('should handle editors array with null values', () => {
      const transcription = {
        id: 'test-id',
        author: 'other-user-id',
        editors: ['test-user-id', null, 'another-editor-id'],
      };

      const result = canEditTranscription(transcription);

      expect(result).toBe(true);
    });

    it('should be case sensitive for userId matching', () => {
      const transcription = {
        id: 'test-id',
        author: 'Test-User-Id', // Different case
        editors: ['TEST-USER-ID'], // Different case
      };

      const result = canEditTranscription(transcription);

      expect(result).toBe(false);
    });

    it('should prioritize author check over editors check', () => {
      const transcription = {
        id: 'test-id',
        author: 'test-user-id',
        editors: ['test-user-id'], // User is both author and editor
      };

      const result = canEditTranscription(transcription);

      expect(result).toBe(true);
    });
  });
}); 