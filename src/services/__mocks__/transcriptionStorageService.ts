// Mock for transcriptionStorageService
export const transcriptionStorage = {
  shouldSync: jest.fn().mockResolvedValue(true),
  getLastSyncedAt: jest.fn().mockResolvedValue(null),
  storeTranscriptions: jest.fn().mockResolvedValue(undefined),
  setLastSyncedAt: jest.fn().mockResolvedValue(undefined),
  getAll: jest.fn().mockResolvedValue([]),
  getById: jest.fn().mockResolvedValue(null),
  clearCache: jest.fn().mockResolvedValue(undefined),
  removeTranscription: jest.fn().mockResolvedValue(undefined),
  getCacheStats: jest.fn().mockResolvedValue({
    totalCached: 0,
    memoryCount: 0,
    oldestCacheTime: null,
    newestCacheTime: null
  }),
  // New methods for hybrid sync
  getLastOwnedSyncedAt: jest.fn().mockResolvedValue(null),
  setLastOwnedSyncedAt: jest.fn().mockResolvedValue(undefined),
  getLastSharedSyncedAt: jest.fn().mockResolvedValue(null),
  setLastSharedSyncedAt: jest.fn().mockResolvedValue(undefined),
  getOwnedTranscriptions: jest.fn().mockResolvedValue([]),
  getSharedTranscriptions: jest.fn().mockResolvedValue([]),
  shouldValidateCache: jest.fn().mockResolvedValue(false),
  markCacheValidated: jest.fn().mockResolvedValue(undefined)
};
