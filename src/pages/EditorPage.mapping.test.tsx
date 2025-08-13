import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock react-router to provide a transcription id
jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useParams: () => ({ id: 't1' }),
}));

// Mock hooks that perform side effects to no-ops
jest.mock('../hooks/useLoadTranscription', () => ({
  useLoadTranscription: () => undefined,
}));
jest.mock('../hooks/useSubscriptions', () => ({
  useSubscriptions: () => undefined,
}));
jest.mock('../hooks/useUpdateTranscription', () => ({
  useUpdateTranscription: () => jest.fn(),
}));
jest.mock('../hooks/useUpdateIssue', () => ({
  useUpdateIssue: () => jest.fn(),
}));
jest.mock('../hooks/useDeleteIssue', () => ({
  useDeleteIssue: () => jest.fn(),
}));

// Mock heavy child components to simple placeholders
jest.mock('../components/player/WaveformPlayer', () => ({
  WaveformPlayer: () => <div data-testid="waveform-player" />,
}));
jest.mock('../components/regions/RegionList', () => ({
  RegionList: () => <div data-testid="region-list" />,
}));
jest.mock('../components/inspector/StationaryInspector', () => ({
  StationaryInspector: () => <div data-testid="stationary-inspector" />,
}));
jest.mock('../components/forms/TranscriptionSettingsPage', () => ({
  TranscriptionSettingsPage: () => <div data-testid="settings-page" />,
}));

// Capture the issues prop given to IssuesPanel so we can assert mapping
let lastIssuesProp: unknown = null;
jest.mock('../components/issues/IssuesPanel', () => ({
  IssuesPanel: ({ issues }: { issues: unknown }) => {
    lastIssuesProp = issues;
    return <div data-testid="issues-panel" />;
  },
}));

// Mock auth store
jest.mock('../stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: any) => any) =>
    selector({ user: { userId: 'owner-1', username: 'user@example.com' } }),
}));

// Mock editor store with stable object references
// Create a mock store object we can also expose as getState()
const mockStore = {
      transcription: {
        id: 't1',
        title: 'Test',
        author: 'owner-1',
        editors: [],
        isVideo: false,
      },
      accessDenied: false,
      regions: [],
      selectedRegion: { id: 'r1' },
      issues: [
        {
          id: 'i1',
          text: 'ka-caciwihtat',
          type: 'new-word',
          owner: 'owner-1',
          ownerFriendly: 'Owner',
          regionId: 'r1',
          resolved: false,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          commentCount: 0,
        },
      ],
      issueLinkStatusesByRegion: {
        r1: { i1: 'unmatched' },
      },
      issueSuggestionsByRegion: {
        r1: { i1: [{ token: 'ka-caciwihtat', start: 0, end: 12, score: 1 }] },
      },
      cleanup: jest.fn(),
    } as const;

jest.mock('../stores/useEditorStore', () => {
  const hook = (selector: (s: any) => any) => selector(mockStore);
  // Attach getState to mimic zustand store usage in cleanup effect
  (hook as any).getState = () => mockStore;
  return { useEditorStore: hook };
});

import { EditorPage } from './EditorPage';

describe('EditorPage issues mapping', () => {
  it('passes unmatched linkStatus and suggestions to IssuesPanel (no infinite loop)', () => {
    lastIssuesProp = null;
    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    // IssuesPanel rendered
    expect(screen.getByTestId('issues-panel')).toBeInTheDocument();

    // Verify the mapped issues contain linkStatus and suggestions from store
    const issues = lastIssuesProp as Array<any>;
    expect(Array.isArray(issues)).toBe(true);
    expect(issues[0].id).toBe('i1');
    expect(issues[0].linkStatus).toBe('unmatched');
    expect(issues[0].suggestions?.length).toBeGreaterThan(0);
  });
});

