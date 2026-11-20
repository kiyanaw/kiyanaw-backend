import { TranscriptionModel, parseTranscriptionExtra } from './adt';
import type { TranscriptionData } from './adt';

const base: TranscriptionData = {
  id: 'tx-1',
  title: 'Story',
  author: 'author-1',
  authorFriendly: 'author',
  type: 'audio',
  userLastUpdated: 'author',
  length: 10,
};

const MENTOR = { status: 'done' as const, date: '2026-11-19T15:30:00.000Z', by: 'mentor-user', playlistId: 'pl-1' };
const PLAYLIST = { playlistId: 'pl-1', name: 'Elders 2026', date: '2026-11-18T10:00:00.000Z' };

const localDate = (iso: string) => new Date(iso).toLocaleDateString();

describe('Transcription extra', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation();
  });
  afterEach(() => warn.mockRestore());

  describe('parseTranscriptionExtra', () => {
    it('parses both keys', () => {
      const extra = parseTranscriptionExtra(JSON.stringify({ mentorImport: MENTOR, fromPlaylist: PLAYLIST }), 'tx-1');
      expect(extra).toEqual({ mentorImport: MENTOR, fromPlaylist: PLAYLIST });
      expect(warn).not.toHaveBeenCalled();
    });

    it('parses one key and leaves the other absent', () => {
      expect(parseTranscriptionExtra(JSON.stringify({ fromPlaylist: PLAYLIST }), 'tx-1')).toEqual({ fromPlaylist: PLAYLIST });
    });

    it('keeps mentorImport without the optional playlistId', () => {
      const { playlistId: _omit, ...noPlaylist } = MENTOR;
      expect(parseTranscriptionExtra(JSON.stringify({ mentorImport: noPlaylist }), 'tx-1'))
        .toEqual({ mentorImport: noPlaylist });
    });

    it.each([null, undefined, ''])('treats %p as no extra without logging', (raw) => {
      expect(parseTranscriptionExtra(raw, 'tx-1')).toEqual({});
      expect(warn).not.toHaveBeenCalled();
    });

    it('ignores unknown keys', () => {
      const raw = JSON.stringify({ source: 'mentor', importedToMentor: { at: 'x' }, fromPlaylist: PLAYLIST });
      expect(parseTranscriptionExtra(raw, 'tx-1')).toEqual({ fromPlaylist: PLAYLIST });
      expect(warn).not.toHaveBeenCalled();
    });

    it('logs and returns no extra for malformed JSON', () => {
      expect(parseTranscriptionExtra('{not json', 'tx-1')).toEqual({});
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('tx-1'), expect.any(SyntaxError));
    });

    it.each(['[1,2]', '"text"', '42', 'null'])('logs and returns no extra for non-object JSON %s', (raw) => {
      expect(parseTranscriptionExtra(raw, 'tx-1')).toEqual({});
      expect(warn).toHaveBeenCalled();
    });

    it('drops a known key with the wrong shape and keeps the valid one', () => {
      const raw = JSON.stringify({ mentorImport: { date: 'not a date', by: 'x' }, fromPlaylist: PLAYLIST });
      expect(parseTranscriptionExtra(raw, 'tx-1')).toEqual({ fromPlaylist: PLAYLIST });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('mentorImport'));
    });

    it('drops fromPlaylist without a name', () => {
      const raw = JSON.stringify({ fromPlaylist: { playlistId: 'pl-1', date: PLAYLIST.date } });
      expect(parseTranscriptionExtra(raw, 'tx-1')).toEqual({});
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('fromPlaylist'));
    });
  });

  describe('TranscriptionModel', () => {
    it('exposes parsed extra and both badges', () => {
      const model = new TranscriptionModel({ ...base, extra: JSON.stringify({ mentorImport: MENTOR, fromPlaylist: PLAYLIST }) });
      expect(model.extraInfo).toEqual({ mentorImport: MENTOR, fromPlaylist: PLAYLIST });
      expect(model.extraBadges).toEqual([
        { kind: 'fromPlaylist', label: 'From playlist Elders 2026' },
        { kind: 'mentorImport', label: `Imported to Mentor ${localDate(MENTOR.date)}` },
      ]);
    });

    it('shows a date-only import date as that calendar day', () => {
      const model = new TranscriptionModel({ ...base, extra: JSON.stringify({ mentorImport: { status: 'done', date: '2026-11-19', by: 'm' } }) });
      expect(model.extraBadges).toEqual([
        { kind: 'mentorImport', label: `Imported to Mentor ${new Date(2026, 10, 19).toLocaleDateString()}` },
      ]);
    });

    it('has no badges when extra is missing', () => {
      const model = new TranscriptionModel(base);
      expect(model.extraInfo).toEqual({});
      expect(model.extraBadges).toEqual([]);
    });

    it('shows no Mentor badge while an import is still pending', () => {
      const pending = { ...MENTOR, status: 'pending' as const };
      const model = new TranscriptionModel({ ...base, extra: JSON.stringify({ mentorImport: pending, fromPlaylist: PLAYLIST }) });
      expect(model.extraInfo.mentorImport).toEqual(pending);
      expect(model.extraBadges.map((b) => b.kind)).toEqual(['fromPlaylist']);
    });

    it('drops mentorImport with a missing or unknown status', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const { status: _omit, ...noStatus } = MENTOR;
      expect(parseTranscriptionExtra(JSON.stringify({ mentorImport: noStatus }), 'tx-1')).toEqual({});
      expect(parseTranscriptionExtra(JSON.stringify({ mentorImport: { ...MENTOR, status: 'started' } }), 'tx-1')).toEqual({});
      expect(warn).toHaveBeenCalledTimes(2);
      warn.mockRestore();
    });

    it('has no badges when extra is malformed', () => {
      const model = new TranscriptionModel({ ...base, extra: '{oops' });
      expect(model.extraBadges).toEqual([]);
    });
  });
});
