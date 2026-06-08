import { useTranscriptionsStore } from './useTranscriptionsStore';
import { TranscriptionModel } from '../services/adt';

jest.mock('../services/adt');
jest.mock('../services');
jest.mock('../use-cases/load-transcriptions');

describe('useTranscriptionsStore', () => {
  beforeEach(() => {
    useTranscriptionsStore.setState({
      transcriptions: [],
      loading: false,
      error: null,
      isSyncing: false,
      lastSyncedAt: null,
      cacheStats: null,
      ownedSyncStatus: null,
      sharedSyncStatus: null,
    });
  });

  describe('reset()', () => {
    it('clears transcriptions and resets all state to initial values', () => {
      const mockModel = { id: 'tx-1', author: 'user-a' } as TranscriptionModel;
      useTranscriptionsStore.setState({
        transcriptions: [mockModel],
        loading: true,
        error: 'some error',
        isSyncing: true,
        lastSyncedAt: '2025-01-01T00:00:00Z',
        cacheStats: { count: 1, lastSyncedAt: '2025-01-01T00:00:00Z' },
        ownedSyncStatus: 'synced',
        sharedSyncStatus: 'syncing',
      });

      useTranscriptionsStore.getState().reset();

      const state = useTranscriptionsStore.getState();
      expect(state.transcriptions).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isSyncing).toBe(false);
      expect(state.lastSyncedAt).toBeNull();
      expect(state.cacheStats).toBeNull();
      expect(state.ownedSyncStatus).toBeNull();
      expect(state.sharedSyncStatus).toBeNull();
    });

    it('results in an empty shared-with-me list after account switch', () => {
      const mockModel = { id: 'tx-1', author: 'user-a', isMine: () => false } as unknown as TranscriptionModel;
      useTranscriptionsStore.getState().setTranscriptions([mockModel]);

      // Simulate: new user B logs in and the store is reset before their data loads
      useTranscriptionsStore.getState().reset();

      const { transcriptions } = useTranscriptionsStore.getState();
      const sharedWithMe = transcriptions.filter((t) => !t.isMine('user-b-id'));
      expect(sharedWithMe).toHaveLength(0);
    });
  });
});
