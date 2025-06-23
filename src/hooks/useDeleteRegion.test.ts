import { renderHook, act } from '@testing-library/react';
import { useDeleteRegion } from './useDeleteRegion';
import { DeleteRegion } from '../use-cases/delete-region';
import { useEditorStore } from '../stores/useEditorStore';

// Mock the use-case
jest.mock('../use-cases/delete-region');
const MockedDeleteRegion = DeleteRegion as jest.MockedClass<typeof DeleteRegion>;

// Mock the store
jest.mock('../stores/useEditorStore', () => ({
  useEditorStore: {
    getState: jest.fn(),
  },
}));

// Mock services
jest.mock('../services', () => ({
  services: {
    regionService: {},
    authService: {},
    wavesurferService: {},
  },
}));

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: jest.fn(),
});

// Mock window.alert
Object.defineProperty(window, 'alert', {
  writable: true,
  value: jest.fn(),
});

const mockedUseEditorStore = useEditorStore as jest.Mocked<typeof useEditorStore>;

describe('useDeleteRegion', () => {
  const mockTranscription = {
    id: 'test-transcription-id',
    title: 'Test Transcription',
  };

  const mockStore = {
    transcription: mockTranscription,
    regionById: jest.fn(),
    deleteRegion: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (window.confirm as jest.Mock).mockReturnValue(true);
    (window.alert as jest.Mock).mockClear();
    MockedDeleteRegion.mockClear();
    mockedUseEditorStore.getState.mockReturnValue(mockStore as any);
  });

  describe('return value structure', () => {
    it('should return deleteRegion function', () => {
      const { result } = renderHook(() => useDeleteRegion());

      expect(typeof result.current.deleteRegion).toBe('function');
    });
  });

  describe('user confirmation flow', () => {
    it('should show confirmation dialog before deletion', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      MockedDeleteRegion.mockImplementation(() => ({
        execute: mockExecute,
      } as any));

      const { result } = renderHook(() => useDeleteRegion());

      await act(async () => {
        await result.current.deleteRegion('test-region-id');
      });

      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this region? This action cannot be undone.'
      );
    });

    it('should proceed with deletion when user confirms', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      MockedDeleteRegion.mockImplementation(() => ({
        execute: mockExecute,
      } as any));
      (window.confirm as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() => useDeleteRegion());

      await act(async () => {
        await result.current.deleteRegion('test-region-id');
      });

      expect(MockedDeleteRegion).toHaveBeenCalledWith({
        regionId: 'test-region-id',
        transcriptionId: 'test-transcription-id',
        services: expect.any(Object),
        store: mockStore,
      });
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should abort deletion when user cancels', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      MockedDeleteRegion.mockImplementation(() => ({
        execute: mockExecute,
      } as any));
      (window.confirm as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useDeleteRegion());

      await act(async () => {
        await result.current.deleteRegion('test-region-id');
      });

      expect(MockedDeleteRegion).not.toHaveBeenCalled();
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  describe('transcription validation', () => {
    it('should throw error when no transcription is loaded', async () => {
      mockedUseEditorStore.getState.mockReturnValue({
        ...mockStore,
        transcription: null,
      } as any);

      const { result } = renderHook(() => useDeleteRegion());

      await act(async () => {
        await result.current.deleteRegion('test-region-id');
      });

      expect(window.alert).toHaveBeenCalledWith(
        'Failed to delete region. Please try again.'
      );
    });
  });

  describe('error handling', () => {
    it('should show alert when deletion fails', async () => {
      const mockExecute = jest.fn().mockRejectedValue(new Error('Network error'));
      MockedDeleteRegion.mockImplementation(() => ({
        execute: mockExecute,
      } as any));

      const { result } = renderHook(() => useDeleteRegion());

      await act(async () => {
        await result.current.deleteRegion('test-region-id');
      });

      expect(window.alert).toHaveBeenCalledWith(
        'Failed to delete region. Please try again.'
      );
    });

    it('should handle deletion cancellation without error', async () => {
      (window.confirm as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useDeleteRegion());

      await act(async () => {
        await result.current.deleteRegion('test-region-id');
      });

      expect(window.alert).not.toHaveBeenCalled();
    });

    it('should log errors to console', async () => {
      const mockExecute = jest.fn().mockRejectedValue(new Error('Network error'));
      MockedDeleteRegion.mockImplementation(() => ({
        execute: mockExecute,
      } as any));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useDeleteRegion());

      await act(async () => {
        await result.current.deleteRegion('test-region-id');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to delete region:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
}); 