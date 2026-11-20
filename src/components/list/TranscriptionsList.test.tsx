import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TranscriptionsList } from './TranscriptionsList';
import { TranscriptionModel } from '../../services/adt';
import type { TranscriptionData } from '../../services/adt';

jest.mock('../../services', () => ({ services: { mediaService: { getMedia: jest.fn() } } }));
jest.mock('../../services/mediaService', () => ({ MEDIA_STATUS: { PENDING: 'PENDING', PROCESSING: 'PROCESSING' } }));
jest.mock('../../use-cases/delete-transcription', () => ({ DeleteTranscriptionUseCase: jest.fn() }));
jest.mock('../../use-cases/sync-owned-transcriptions', () => ({
  SyncOwnedTranscriptions: jest.fn(() => ({ execute: () => Promise.resolve() })),
}));
jest.mock('../../use-cases/sync-shared-transcriptions', () => ({
  SyncSharedTranscriptions: jest.fn(() => ({ execute: () => Promise.resolve() })),
}));
jest.mock('../../hooks/useLoadTranscriptions', () => ({ useLoadTranscriptions: () => jest.fn() }));

const ME = 'me-sub';
let mockTranscriptions: TranscriptionModel[] = [];

jest.mock('../../stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { user: { userId: string; username: string } }) => unknown) =>
    selector({ user: { userId: 'me-sub', username: 'me@example.com' } }),
}));
jest.mock('../../stores/useTranscriptionsStore', () => {
  const state = () => ({
    transcriptions: mockTranscriptions,
    loading: false,
    error: null,
    reload: jest.fn(),
    ownedSyncStatus: 'synced',
    sharedSyncStatus: 'synced',
    applyMediaStatus: jest.fn(),
    removeTranscription: jest.fn(),
  });
  const hook = (selector: (s: ReturnType<typeof state>) => unknown) => selector(state());
  hook.getState = state;
  return { useTranscriptionsStore: hook };
});

const PLAYLIST = { playlistId: 'pl-1', name: 'A very long playlist name from the Elders gathering 2026', date: '2026-11-18T10:00:00.000Z' };
const MENTOR = { date: '2026-11-19T15:30:00.000Z', by: 'mentor-user' };

const model = (id: string, author: string, extra?: object) => {
  const data: TranscriptionData = {
    id, title: `Title ${id}`, author, authorFriendly: author, type: 'audio', userLastUpdated: author, length: 30,
    dateLastUpdated: '2026-11-19T00:00:00.000Z',
    ...(extra && { extra: JSON.stringify(extra) }),
  };
  const m = new TranscriptionModel(data);
  m.setAccessLevel(ME);
  return m;
};

const renderList = () => render(<MemoryRouter><TranscriptionsList /></MemoryRouter>);
const row = (id: string) => screen.getAllByTestId('transcription-list-item').find(el => el.dataset.transcriptionId === id)!;

describe('TranscriptionsList extra badges', () => {
  it('shows both badges in the mobile and desktop layouts of an owned row', () => {
    mockTranscriptions = [model('both', ME, { mentorImport: MENTOR, fromPlaylist: PLAYLIST })];
    renderList();

    const r = within(row('both'));
    const playlist = r.getAllByTestId('extra-badge-fromPlaylist');
    const mentor = r.getAllByTestId('extra-badge-mentorImport');
    expect(playlist).toHaveLength(2); // mobile + desktop
    expect(mentor).toHaveLength(2);
    expect(playlist[0]).toHaveTextContent(`From playlist ${PLAYLIST.name}`);
    expect(playlist[0]).toHaveAttribute('title', `From playlist ${PLAYLIST.name}`);
    expect(playlist[0]).toHaveClass('truncate');
    expect(mentor[0]).toHaveTextContent(`Imported to Mentor ${new Date(MENTOR.date).toLocaleDateString()}`);
  });

  it('shows only the badge that is set', () => {
    mockTranscriptions = [model('playlist-only', ME, { fromPlaylist: PLAYLIST })];
    renderList();

    const r = within(row('playlist-only'));
    expect(r.getAllByTestId('extra-badge-fromPlaylist')).toHaveLength(2);
    expect(r.queryByTestId('extra-badge-mentorImport')).toBeNull();
  });

  it('shows nothing when extra is absent or malformed', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation();
    const malformed = model('bad', ME);
    mockTranscriptions = [model('none', ME), new TranscriptionModel({ ...malformed.data, extra: '{oops' })];
    renderList();

    for (const id of ['none', 'bad']) {
      const r = within(row(id));
      expect(r.queryByTestId('extra-badges')).toBeNull();
      expect(r.queryByTestId(/^extra-badge-/)).toBeNull();
    }
    warn.mockRestore();
  });

  it('shows badges on the Shared with Me tab', () => {
    mockTranscriptions = [model('shared', 'someone-else', { mentorImport: MENTOR })];
    renderList();
    fireEvent.click(screen.getByRole('button', { name: /shared with me/i }));

    expect(within(row('shared')).getAllByTestId('extra-badge-mentorImport')).toHaveLength(2);
  });
});
