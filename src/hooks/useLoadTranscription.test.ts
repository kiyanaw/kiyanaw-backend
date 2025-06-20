import { renderHook } from '@testing-library/react';
import { useLoadTranscription } from './useLoadTranscription';
import { services } from '../services';
import { LoadTranscription } from '../use-cases/load-transcription';
import { useEditorStore } from '../stores/useEditorStore';

// Mock the dependencies
jest.mock('../services', () => ({
  services: {
    transcriptionService: {},
    regionService: {},
    wavesurferService: {},
    browserService: {},
    rteService: {}
  }
}));
jest.mock('../use-cases/load-transcription');
jest.mock('../stores/useEditorStore');

describe('useLoadTranscription', () => {
  // Mock implementations
  const mockExecute = jest.fn();
  const mockStore = {
    setFullTranscriptionData: jest.fn(),
    cleanup: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock LoadTranscription constructor and methods
    (LoadTranscription as jest.MockedClass<typeof LoadTranscription>).mockImplementation(() => ({
      execute: mockExecute,
      validate: jest.fn(),
    } as any));

    // Mock useEditorStore.getState()
    (useEditorStore.getState as jest.Mock).mockReturnValue(mockStore);
  });

  describe('debouncing behavior with useRef', () => {
    it('should call the use case when transcriptionId is provided for the first time', () => {
      const transcriptionId = 'test-id-1';

      renderHook(() => useLoadTranscription(transcriptionId));

      expect(LoadTranscription).toHaveBeenCalledWith({
        transcriptionId,
        services,
        store: mockStore,
      });
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should NOT call the use case again when the same transcriptionId is used', () => {
      const transcriptionId = 'test-id-1';

      // First render
      const { rerender } = renderHook(
        ({ id }) => useLoadTranscription(id),
        { initialProps: { id: transcriptionId } }
      );

      // Clear mocks after first render
      jest.clearAllMocks();

      // Re-render with the same transcriptionId
      rerender({ id: transcriptionId });

      expect(LoadTranscription).not.toHaveBeenCalled();
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should call the use case when transcriptionId changes to a new value', () => {
      const initialId = 'test-id-1';
      const newId = 'test-id-2';

      const { rerender } = renderHook(
        ({ id }) => useLoadTranscription(id),
        { initialProps: { id: initialId } }
      );

      // Verify first call
      expect(LoadTranscription).toHaveBeenCalledWith({
        transcriptionId: initialId,
        services,
        store: mockStore,
      });
      expect(mockExecute).toHaveBeenCalledTimes(1);

      // Clear mocks and change to new ID
      jest.clearAllMocks();
      rerender({ id: newId });

      // Verify second call with new ID
      expect(LoadTranscription).toHaveBeenCalledWith({
        transcriptionId: newId,
        services,
        store: mockStore,
      });
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should call the use case again when transcriptionId changes back to a previous value', () => {
      const firstId = 'test-id-1';
      const secondId = 'test-id-2';

      const { rerender } = renderHook(
        ({ id }) => useLoadTranscription(id),
        { initialProps: { id: firstId } }
      );

      // Change to second ID
      rerender({ id: secondId });

      // Clear mocks and change back to first ID
      jest.clearAllMocks();
      rerender({ id: firstId });

      // Should call use case again even though we've seen this ID before
      expect(LoadTranscription).toHaveBeenCalledWith({
        transcriptionId: firstId,
        services,
        store: mockStore,
      });
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should handle empty string transcriptionId changes correctly', () => {
      const transcriptionId = '';

      renderHook(() => useLoadTranscription(transcriptionId));

      expect(LoadTranscription).toHaveBeenCalledWith({
        transcriptionId: '',
        services,
        store: mockStore,
      });
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple rapid re-renders with the same transcriptionId correctly', () => {
      const transcriptionId = 'test-id-1';

      const { rerender } = renderHook(
        ({ id }) => useLoadTranscription(id),
        { initialProps: { id: transcriptionId } }
      );

      // Multiple re-renders with same ID
      rerender({ id: transcriptionId });
      rerender({ id: transcriptionId });
      rerender({ id: transcriptionId });

      // Should only be called once (from initial render)
      expect(LoadTranscription).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('use case instantiation and execution', () => {
    it('should create LoadTranscription with correct parameters', () => {
      const transcriptionId = 'test-transcription-id';

      renderHook(() => useLoadTranscription(transcriptionId));

      expect(LoadTranscription).toHaveBeenCalledWith({
        transcriptionId,
        services,
        store: mockStore,
      });
    });

    it('should call execute on the use case instance', () => {
      const transcriptionId = 'test-transcription-id';

      renderHook(() => useLoadTranscription(transcriptionId));

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledWith();
    });

    it('should get fresh store state for each use case execution', () => {
      const transcriptionId1 = 'test-id-1';
      const transcriptionId2 = 'test-id-2';

      const { rerender } = renderHook(
        ({ id }) => useLoadTranscription(id),
        { initialProps: { id: transcriptionId1 } }
      );

      // Verify first call gets store state
      expect(useEditorStore.getState).toHaveBeenCalledTimes(1);

      rerender({ id: transcriptionId2 });

      // Verify second call gets fresh store state
      expect(useEditorStore.getState).toHaveBeenCalledTimes(2);
    });

    it('should handle undefined transcriptionId', () => {
      const transcriptionId = undefined as any;

      renderHook(() => useLoadTranscription(transcriptionId));

      // The hook logic shows that undefined !== undefined is false on first call
      // because lastCalledRef.current starts as undefined
      // So it should NOT call the use case when transcriptionId is undefined on first render
      expect(LoadTranscription).not.toHaveBeenCalled();
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should ensure the lastCalledRef starts as undefined and properly tracks changes', () => {
      const firstId = 'first-id';
      const secondId = 'second-id';

      // Test that ref starts as undefined by providing a real transcriptionId first
      const { rerender } = renderHook(
        ({ id }) => useLoadTranscription(id),
        { initialProps: { id: firstId } }
      );

      // First call should execute because lastCalledRef.current (undefined) !== 'first-id'
      expect(LoadTranscription).toHaveBeenCalledTimes(1);
      expect(LoadTranscription).toHaveBeenCalledWith({
        transcriptionId: firstId,
        services,
        store: mockStore,
      });

      // Reset mocks and change ID
      jest.clearAllMocks();
      rerender({ id: secondId });

      // Should execute again because 'first-id' !== 'second-id'
      expect(LoadTranscription).toHaveBeenCalledTimes(1);
      expect(LoadTranscription).toHaveBeenCalledWith({
        transcriptionId: secondId,
        services,
        store: mockStore,
      });

      // Reset mocks and use same ID again
      jest.clearAllMocks();
      rerender({ id: secondId });

      // Should NOT execute because 'second-id' === 'second-id'
      expect(LoadTranscription).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should work correctly when transcriptionId changes from undefined to defined', () => {
      const { rerender } = renderHook(
        ({ id }) => useLoadTranscription(id),
        { initialProps: { id: undefined as any } }
      );

      // Clear mocks after first render
      jest.clearAllMocks();

      // Change to defined value
      rerender({ id: 'defined-id' });

      expect(LoadTranscription).toHaveBeenCalledWith({
        transcriptionId: 'defined-id',
        services,
        store: mockStore,
      });
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should work correctly when transcriptionId changes from defined to undefined', () => {
      const { rerender } = renderHook(
        ({ id }) => useLoadTranscription(id),
        { initialProps: { id: 'defined-id' } }
      );

      // Clear mocks after first render
      jest.clearAllMocks();

      // Change to undefined
      rerender({ id: undefined as any });

      expect(LoadTranscription).toHaveBeenCalledWith({
        transcriptionId: undefined,
        services,
        store: mockStore,
      });
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });
}); 