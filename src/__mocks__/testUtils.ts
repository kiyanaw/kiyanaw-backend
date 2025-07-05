// Test utilities for consistent mocking across the codebase

import type { TranscriptionData } from '../services/adt';

export interface MockStoreOptions {
  transcription?: Partial<TranscriptionData> | null;
  regions?: unknown[];
  selectedRegionId?: string | null;
  canEdit?: boolean;
  saved?: boolean;
  accessDenied?: boolean;
  issues?: unknown[];
}

export interface MockServicesOptions {
  authService?: {
    currentUser?: () => { username: string; userId: string };
  };
  regionService?: {
    updateRegion?: jest.Mock;
    createRegion?: jest.Mock;
    deleteRegion?: jest.Mock;
  };
  transcriptionService?: {
    updateTranscription?: jest.Mock;
  };
  wavesurferService?: {
    getRegionsPlugin?: jest.Mock;
    updateRegionIndices?: jest.Mock;
    pause?: jest.Mock;
    clearRegionBoundedPlayback?: jest.Mock;
  };
}

/**
 * Creates a consistent mock store object with customizable properties
 */
export function createMockStore(options: MockStoreOptions = {}) {
  const defaultTranscription: TranscriptionData = {
    id: 'test-transcription-id',
    title: 'Test Transcription',
    source: 'test-source',
    type: 'test-type',
    author: 'test-author',
    userLastUpdated: 'test-user',
    dateLastUpdated: '2023-01-01T00:00:00.000Z',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
    length: 120, // Duration in seconds
    comments: 'Test comments',
    coverage: 85,
    isPrivate: false,
    disableAnalyzer: false,
    editors: null,
    viewers: null,
    isVideo: false,
  };

  return {
    transcription: options.transcription === null ? null : { ...defaultTranscription, ...options.transcription },
    regions: options.regions || [],
    regionMap: {},
    selectedRegionId: options.selectedRegionId || null,
    selectedRegion: null,
    canEdit: options.canEdit !== undefined ? options.canEdit : true,
    saved: options.saved !== undefined ? options.saved : false,
    accessDenied: options.accessDenied !== undefined ? options.accessDenied : false,
    peaks: null,
    playbackWithinRegion: null,
    knownWords: new Set<string>(),
    issues: options.issues || [],
    issueMap: {},
    isVideo: false,
    transcriptionTitle: 'Test Transcription',
    _subscriptions: [],
    
    // Methods
    setFullTranscriptionData: jest.fn(),
    setAccessDenied: jest.fn(),
    setCanEdit: jest.fn(),
    cleanup: jest.fn(),
    updateTranscription: jest.fn(),
    setTranscription: jest.fn(),
    setSaved: jest.fn(),
    setSelectedRegion: jest.fn(),
    setPlaybackWithinRegion: jest.fn(),
    updateRegion: jest.fn(),
    createRegion: jest.fn(),
    deleteRegion: jest.fn(),
    addNewRegion: jest.fn(),
    setRegionText: jest.fn(),
    setRegionTranslation: jest.fn(),
    updateRegionBounds: jest.fn(),
    addKnownWords: jest.fn(),
    setRegionAnalysis: jest.fn(),
    createIssue: jest.fn(),
    updateIssue: jest.fn(),
    deleteIssue: jest.fn(),
    addComment: jest.fn(),
    isTranscriptionAuthor: jest.fn(() => false),
    regionById: jest.fn(() => null),
    issueById: jest.fn(() => null),
    issuesByRegion: jest.fn(() => []),
    getState: jest.fn(),
  };
}

/**
 * Creates consistent mock services with customizable properties
 */
export function createMockServices(options: MockServicesOptions = {}) {
  return {
    authService: {
      currentUser: jest.fn(() => ({ username: 'test-user', userId: 'user-123' })),
      ...options.authService,
    },
    regionService: {
      updateRegion: jest.fn(),
      createRegion: jest.fn(),
      deleteRegion: jest.fn(),
      ...options.regionService,
    },
    transcriptionService: {
      updateTranscription: jest.fn(),
      ...options.transcriptionService,
    },
    wavesurferService: {
      getRegionsPlugin: jest.fn(),
      updateRegionIndices: jest.fn(),
      pause: jest.fn(),
      clearRegionBoundedPlayback: jest.fn(),
      ...options.wavesurferService,
    },
    browserService: {
      updateUrl: jest.fn(),
      setSelectedRegion: jest.fn(),
      addCustomStyle: jest.fn(),
      removeCustomStyle: jest.fn(),
    },
  };
}

/**
 * Creates a mock user object
 */
export function createMockUser(overrides: Partial<{ username: string; userId: string; email: string; name: string }> = {}) {
  return {
    username: 'test-user',
    userId: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    ...overrides,
  };
} 