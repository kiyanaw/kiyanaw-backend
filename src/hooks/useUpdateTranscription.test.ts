import { renderHook, act } from '@testing-library/react';
import { useUpdateTranscription } from './useUpdateTranscription';
import { UpdateTranscriptionUseCase } from '../use-cases/update-transcription';
import { useEditorStore } from '../stores/useEditorStore';
import { useAuth } from './useAuth';

// Mock dependencies
jest.mock('../use-cases/update-transcription');
jest.mock('../stores/useEditorStore');
jest.mock('./useAuth');

// Mock services with a simple object to avoid CSS import issues
jest.mock('../services', () => ({
  services: {
    transcriptionService: {
      updateTranscription: jest.fn(),
    },
  },
}));

const MockedUpdateTranscriptionUseCase = UpdateTranscriptionUseCase as jest.MockedClass<typeof UpdateTranscriptionUseCase>;
const mockedUseEditorStore = useEditorStore as jest.MockedFunction<typeof useEditorStore>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('useUpdateTranscription', () => {
  const mockExecute = jest.fn();
  const mockGetState = jest.fn();
  const mockStore = {
    setTranscription: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock UpdateTranscriptionUseCase
    MockedUpdateTranscriptionUseCase.mockImplementation(() => ({
      execute: mockExecute,
    } as any));

    // Mock useEditorStore
    mockedUseEditorStore.getState = mockGetState;
    mockGetState.mockReturnValue(mockStore);

    // Mock useAuth with authenticated user
    mockedUseAuth.mockReturnValue({
      user: { username: 'testuser' },
    } as any);
  });

  describe('hook initialization', () => {
    it('should return a function', () => {
      const { result } = renderHook(() => useUpdateTranscription('test-transcription-id'));
      
      expect(typeof result.current).toBe('function');
    });

    it('should work with different transcriptionIds', () => {
      const { result: result1 } = renderHook(() => useUpdateTranscription('transcription-1'));
      const { result: result2 } = renderHook(() => useUpdateTranscription('transcription-2'));
      
      expect(typeof result1.current).toBe('function');
      expect(typeof result2.current).toBe('function');
    });
  });

  describe('authentication validation', () => {
    it('should throw error when user is not authenticated', () => {
      mockedUseAuth.mockReturnValue({
        user: null,
      } as any);

      const { result } = renderHook(() => useUpdateTranscription('test-transcription-id'));

      expect(() => {
        act(() => {
          result.current({ title: 'New Title' });
        });
      }).toThrow('User must be authenticated to update transcription');
    });

    it('should throw error when user has no username', () => {
      mockedUseAuth.mockReturnValue({
        user: { username: null },
      } as any);

      const { result } = renderHook(() => useUpdateTranscription('test-transcription-id'));

      expect(() => {
        act(() => {
          result.current({ title: 'New Title' });
        });
      }).toThrow('User must be authenticated to update transcription');
    });

    it('should throw error when user has empty username', () => {
      mockedUseAuth.mockReturnValue({
        user: { username: '' },
      } as any);

      const { result } = renderHook(() => useUpdateTranscription('test-transcription-id'));

      expect(() => {
        act(() => {
          result.current({ title: 'New Title' });
        });
      }).toThrow('User must be authenticated to update transcription');
    });
  });

  describe('use case execution', () => {
    it('should create and execute UpdateTranscriptionUseCase with correct parameters', () => {
      const { result } = renderHook(() => useUpdateTranscription('test-transcription-id'));

      act(() => {
        result.current({ title: 'New Title' });
      });

      expect(MockedUpdateTranscriptionUseCase).toHaveBeenCalledWith({
        transcriptionId: 'test-transcription-id',
        updates: { title: 'New Title' },
        username: 'testuser',
        services: expect.any(Object),
        store: mockStore,
      });

      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should handle updates with both title and comments', () => {
      const { result } = renderHook(() => useUpdateTranscription('test-transcription-id'));

      act(() => {
        result.current({ title: 'New Title', comments: 'New comments' });
      });

      expect(MockedUpdateTranscriptionUseCase).toHaveBeenCalledWith({
        transcriptionId: 'test-transcription-id',
        updates: { title: 'New Title', comments: 'New comments' },
        username: 'testuser',
        services: expect.any(Object),
        store: mockStore,
      });
    });

    it('should handle updates with only comments', () => {
      const { result } = renderHook(() => useUpdateTranscription('test-transcription-id'));

      act(() => {
        result.current({ comments: 'Just comments' });
      });

      expect(MockedUpdateTranscriptionUseCase).toHaveBeenCalledWith({
        transcriptionId: 'test-transcription-id',
        updates: { comments: 'Just comments' },
        username: 'testuser',
        services: expect.any(Object),
        store: mockStore,
      });
    });

    it('should handle empty updates object', () => {
      const { result } = renderHook(() => useUpdateTranscription('test-transcription-id'));

      act(() => {
        result.current({});
      });

      expect(MockedUpdateTranscriptionUseCase).toHaveBeenCalledWith({
        transcriptionId: 'test-transcription-id',
        updates: {},
        username: 'testuser',
        services: expect.any(Object),
        store: mockStore,
      });
    });
  });

  describe('caching behavior', () => {
    it('should not execute same update twice in a row', () => {
      const { result } = renderHook(() => useUpdateTranscription('test-transcription-id'));

      const updates = { title: 'Same Title' };

      act(() => {
        result.current(updates);
      });

      act(() => {
        result.current(updates);
      });

      expect(MockedUpdateTranscriptionUseCase).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should execute different updates', () => {
      const { result } = renderHook(() => useUpdateTranscription('test-transcription-id'));

      act(() => {
        result.current({ title: 'First Title' });
      });

      act(() => {
        result.current({ title: 'Second Title' });
      });

      expect(MockedUpdateTranscriptionUseCase).toHaveBeenCalledTimes(2);
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('should execute same updates with different transcriptionId', () => {
      const { result: result1 } = renderHook(() => useUpdateTranscription('transcription-1'));
      const { result: result2 } = renderHook(() => useUpdateTranscription('transcription-2'));

      const updates = { title: 'Same Title' };

      act(() => {
        result1.current(updates);
      });

      act(() => {
        result2.current(updates);
      });

      expect(MockedUpdateTranscriptionUseCase).toHaveBeenCalledTimes(2);
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('should execute same update after different update', () => {
      const { result } = renderHook(() => useUpdateTranscription('test-transcription-id'));

      act(() => {
        result.current({ title: 'First Title' });
      });

      act(() => {
        result.current({ title: 'Second Title' });
      });

      // Now repeat the first update - should execute again
      act(() => {
        result.current({ title: 'First Title' });
      });

      expect(MockedUpdateTranscriptionUseCase).toHaveBeenCalledTimes(3);
      expect(mockExecute).toHaveBeenCalledTimes(3);
    });
  });

  describe('cache key generation', () => {
    it('should treat different object orders as different updates', () => {
      const { result } = renderHook(() => useUpdateTranscription('test-transcription-id'));

      act(() => {
        result.current({ title: 'Title', comments: 'Comments' });
      });

      act(() => {
        result.current({ comments: 'Comments', title: 'Title' });
      });

      // JSON.stringify produces different results for different object orders
      // so these should be treated as different updates
      expect(MockedUpdateTranscriptionUseCase).toHaveBeenCalledTimes(2);
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('should handle undefined values in updates', () => {
      const { result } = renderHook(() => useUpdateTranscription('test-transcription-id'));

      act(() => {
        result.current({ title: 'Title', comments: undefined });
      });

      act(() => {
        result.current({ title: 'Title', comments: undefined });
      });

      // Same update with undefined should only execute once
      expect(MockedUpdateTranscriptionUseCase).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('store integration', () => {
    it('should call useEditorStore.getState to get current store state', () => {
      const { result } = renderHook(() => useUpdateTranscription('test-transcription-id'));

      act(() => {
        result.current({ title: 'New Title' });
      });

      expect(mockGetState).toHaveBeenCalledTimes(1);
    });

    it('should pass the store state to the use case', () => {
      const { result } = renderHook(() => useUpdateTranscription('test-transcription-id'));

      act(() => {
        result.current({ title: 'New Title' });
      });

      expect(MockedUpdateTranscriptionUseCase).toHaveBeenCalledWith(
        expect.objectContaining({
          store: mockStore,
        })
      );
    });
  });

  describe('error handling', () => {
    it('should propagate authentication errors', () => {
      mockedUseAuth.mockReturnValue({
        user: null,
      } as any);

      const { result } = renderHook(() => useUpdateTranscription('test-transcription-id'));

      expect(() => {
        act(() => {
          result.current({ title: 'New Title' });
        });
      }).toThrow('User must be authenticated to update transcription');

      expect(MockedUpdateTranscriptionUseCase).not.toHaveBeenCalled();
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should not catch use case execution errors', () => {
      const useCase = new UpdateTranscriptionUseCase({} as any);
      useCase.execute = jest.fn().mockImplementation(() => {
        throw new Error('Use case error');
      });

      MockedUpdateTranscriptionUseCase.mockImplementation(() => useCase);

      const { result } = renderHook(() => useUpdateTranscription('test-transcription-id'));

      expect(() => {
        act(() => {
          result.current({ title: 'New Title' });
        });
      }).toThrow('Use case error');
    });
  });
}); 