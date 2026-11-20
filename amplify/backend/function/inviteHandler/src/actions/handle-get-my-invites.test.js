jest.mock('./services/invite-service');
jest.mock('./services/transcription-service');

const inviteService = require('./services/invite-service');
const transcriptionService = require('./services/transcription-service');
const { handleGetMyInvites } = require('./handle-get-my-invites');

const invite = (id, transcriptionId) => ({
  id,
  email: 'me@example.com',
  status: 'accepted',
  expiresAt: '2099-01-01T00:00:00.000Z',
  transcriptionId,
});

describe('handleGetMyInvites transcription extra', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation();
    inviteService.getInvitesByEmail = jest.fn().mockResolvedValue([invite('i1', 't1'), invite('i2', 't2')]);
  });
  afterEach(() => jest.restoreAllMocks());

  it('returns extra as a JSON string (like AppSync AWSJSON), null when unset', async () => {
    const extra = { fromPlaylist: { playlistId: 'pl-1', name: 'Elders', date: '2026-11-18' } };
    transcriptionService.getTranscriptionsByIds = jest.fn().mockResolvedValue({
      t1: { id: 't1', title: 'With extra', extra },
      t2: { id: 't2', title: 'Without extra' },
    });

    const { invites } = await handleGetMyInvites({ userEmail: 'me@example.com', includeTranscriptionData: true });

    expect(invites[0].transcription.extra).toBe(JSON.stringify(extra));
    expect(invites[1].transcription.extra).toBeNull();
  });
});
