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
        author: 'testuser',
        editors: [],
      };

      const result = canEditTranscription(transcription);

      expect(result).toBe(true);
    });

    it('should return true when user is in editors array', () => {
      const transcription = {
        id: 'test-id',
        author: 'otheruser',
        editors: ['testuser', 'anothereditor'],
      };

      const result = canEditTranscription(transcription);

      expect(result).toBe(true);
    });

    it('should return false when user is not author or editor', () => {
      const transcription = {
        id: 'test-id',
        author: 'otheruser',
        editors: ['differentuser', 'anothereditor'],
      };

      const result = canEditTranscription(transcription);

      expect(result).toBe(false);
    });

    it('should handle null editors array', () => {
      const transcription = {
        id: 'test-id',
        author: 'otheruser',
        editors: null,
      };

      const result = canEditTranscription(transcription);

      expect(result).toBe(false);
    });

    it('should handle undefined editors array', () => {
      const transcription = {
        id: 'test-id',
        author: 'otheruser',
        editors: undefined,
      };

      const result = canEditTranscription(transcription);

      expect(result).toBe(false);
    });

    it('should handle empty editors array', () => {
      const transcription = {
        id: 'test-id',
        author: 'otheruser',
        editors: [],
      };

      const result = canEditTranscription(transcription);

      expect(result).toBe(false);
    });

    it('should handle editors array with null values', () => {
      const transcription = {
        id: 'test-id',
        author: 'otheruser',
        editors: ['testuser', null, 'anothereditor'],
      };

      const result = canEditTranscription(transcription);

      expect(result).toBe(true);
    });

    it('should be case sensitive for username matching', () => {
      const transcription = {
        id: 'test-id',
        author: 'TestUser', // Different case
        editors: ['TESTUSER'], // Different case
      };

      const result = canEditTranscription(transcription);

      expect(result).toBe(false);
    });

    it('should prioritize author check over editors check', () => {
      const transcription = {
        id: 'test-id',
        author: 'testuser',
        editors: ['testuser'], // User is both author and editor
      };

      const result = canEditTranscription(transcription);

      expect(result).toBe(true);
    });
  });
}); 