/**
 * Repro: "self conflict" when clicking a spelling suggestion (R-CONF-SELF-1).
 *
 * correctSpelling() writes the region through two uncoordinated paths:
 *   - quill 'user' edits -> text-change -> regionSaveManager.queueTextChange (3s debounced flush)
 *   - an immediate, separate region save (debounceMs 0)
 * Both read store.getRegionVersion() before the network call and only bump it after
 * the call resolves, so overlapping saves send the same _version and the server
 * rejects the second one -> conflict dialog against the user's own write.
 *
 * Fixed by routing the suggestion through the save manager (flushNow) and serialising
 * saves per region: a save never starts while another save of that region is in flight.
 */
import type { RegionData } from './adt';

// ---------------------------------------------------------------------------
// Fake quill + rteService (models useTextEditors' main-editor text-change handler)
// ---------------------------------------------------------------------------
type Handler = (text: string) => void;

class MockQuill {
  text = '';
  cursor = 0;
  handler: Handler | null = null;
  getText() {
    return this.text + '\n'; // quill always ends with a newline
  }
  getSelection() {
    return { index: this.cursor, length: 0 };
  }
  setSelection(index: number) {
    this.cursor = index;
  }
  deleteText(index: number, length: number, source: string) {
    this.text = this.text.slice(0, index) + this.text.slice(index + length);
    this.emit(source);
  }
  insertText(index: number, value: string, source: string) {
    this.text = this.text.slice(0, index) + value + this.text.slice(index);
    this.emit(source);
  }
  private emit(source: string) {
    // rteService.onTextChange only forwards 'user' changes, with getText().trim()
    if (source === 'user' && this.handler) this.handler(this.getText().trim());
  }
}

const mockQuills = new Map<string, MockQuill>();

jest.mock('./rteService', () => ({
  rteService: {
    getInstance: (key: string) => mockQuills.get(key) ?? null,
    hasEditor: () => false,
    setContent: jest.fn(),
    queueHighlightingUpdate: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Fake server: per-region _version with AppSync-style conditional check
// ---------------------------------------------------------------------------
interface ServerRow {
  id: string;
  transcriptionId: string;
  regionText: string;
  start: number;
  end: number;
  _version: number;
  userLastUpdated: string;
}

interface PendingCall {
  regionId: string;
  changes: Record<string, unknown>;
  sentVersion: number;
  release: () => void;
  /** Reject like a dropped connection / 5xx (not a version conflict) */
  fail: () => void;
  outcome?: 'ok' | 'conflict' | 'network';
}

const mockServer = {
  rows: new Map<string, ServerRow>(),
  calls: [] as PendingCall[],
  reset() {
    this.rows.clear();
    this.calls = [];
  },
};

jest.mock('./regionService', () => ({
  updateRegion: jest.fn(
    (regionId: string, changes: Record<string, unknown>, username: string, version: number) =>
      new Promise<void>((resolve, reject) => {
        const call: PendingCall = {
          regionId,
          changes,
          sentVersion: version,
          release: () => {
            const row = mockServer.rows.get(regionId)!;
            if (version !== row._version) {
              call.outcome = 'conflict';
              // Same shape AppSync returns; recognised by isVersionConflictError
              reject({
                errors: [
                  {
                    errorType: 'DynamoDB:ConditionalCheckFailedException',
                    message: 'The conditional request failed (Service: DynamoDb, Status Code: 400)',
                  },
                ],
              });
              return;
            }
            Object.assign(row, changes, { _version: row._version + 1, userLastUpdated: username });
            call.outcome = 'ok';
            resolve();
          },
          fail: () => {
            call.outcome = 'network';
            reject(new Error('Network error'));
          },
        };
        mockServer.calls.push(call);
      })
  ),
  getRegion: jest.fn(async (regionId: string) => ({ ...mockServer.rows.get(regionId)! })),
  deleteRegion: jest.fn(async (regionId: string) => {
    mockServer.rows.delete(regionId);
  }),
}));

const mockShowConflictDialog = jest.fn(async () => ({ action: 'accept_remote' as const }));

jest.mock('./index', () => {
  const { storeService } = jest.requireActual('./storeService');
  const { conflictDetectionService } = jest.requireActual('./conflictDetectionService');
  const { rteService } = jest.requireMock('./rteService');
  const regionService = jest.requireMock('./regionService');
  return {
    services: {
      storeService,
      conflictDetectionService,
      rteService,
      regionService,
      conflictResolutionService: { showConflictDialog: mockShowConflictDialog },
      authService: { currentUser: () => ({ username: 'me@example.com' }) },
      spellCheckerService: { analyzeRegionText: jest.fn() },
      wavesurferService: {
        setRegionPosition: jest.fn(),
        pause: jest.fn(),
        clearRegionBoundedPlayback: jest.fn(),
        getRegionsPlugin: () => null,
      },
    },
  };
});

jest.mock('../use-cases/update-transcription', () => ({
  UpdateTranscriptionUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('./issueHighlightService', () => ({
  issueHighlightService: { convertIssuesToHighlights: () => [] },
}));

import { services } from './index';
import { regionSaveManager } from './regionSaveManager';
import { correctSpelling } from '../use-cases/correct-spelling';
import { useEditorStore } from '../stores/useEditorStore';
import { UpdateRegionBounds } from '../use-cases/update-region-bounds';
import { MergeRegionUseCase } from '../use-cases/merge-region';

const REGION_ID = 'region-1';

function seed(text: string) {
  const row: ServerRow = {
    id: REGION_ID,
    transcriptionId: 'trans-1',
    regionText: text,
    start: 0,
    end: 5,
    _version: 1,
    userLastUpdated: 'me@example.com',
  };
  mockServer.rows.set(REGION_ID, row);
  services.storeService.addNewRegion({ ...row } as unknown as RegionData);

  const quill = new MockQuill();
  quill.text = text;
  quill.cursor = text.length;
  // Same as useTextEditors main editor onTextChange handler
  quill.handler = (plain) => {
    if (!services.storeService.isPendingEdit(REGION_ID, 'regionText')) {
      services.storeService.startPendingEdit(REGION_ID, 'regionText');
    } else {
      services.storeService.updatePendingEditActivity(REGION_ID, 'regionText');
    }
    services.storeService.setRegionText(REGION_ID, plain);
    regionSaveManager.queueTextChange(REGION_ID, plain);
  };
  mockQuills.set(`${REGION_ID}:main`, quill);
  return quill;
}

function type(quill: MockQuill, chars: string) {
  for (const ch of chars) {
    quill.insertText(quill.cursor, ch, 'user');
    quill.cursor += 1;
  }
}

/** Put the cursor inside `word` and click its suggestion. */
async function clickSuggestion(quill: MockQuill, word: string, suggestion: string) {
  quill.cursor = quill.text.indexOf(word) + 1;
  await correctSpelling(REGION_ID, word, suggestion);
  await settle(); // flushNow schedules the save on a 0ms timer
}

async function settle(ms = 0) {
  await jest.advanceTimersByTimeAsync(ms);
}

/** Release the i-th server call (in arrival order) and let promise chains run. */
async function release(i: number) {
  mockServer.calls[i].release();
  await settle();
}

/** Release everything still outstanding, repeatedly, until the system goes quiet. */
async function drain() {
  for (let round = 0; round < 10; round++) {
    await settle(10_000);
    const open = mockServer.calls.filter((c) => !c.outcome);
    if (open.length === 0) return;
    for (const c of open) {
      c.release();
      await settle();
    }
  }
}

function expectNoSelfConflict(quill: MockQuill) {
  const conflicts = mockServer.calls
    .filter((c) => c.outcome === 'conflict')
    .map((c) => `sent _version ${c.sentVersion}: ${JSON.stringify(c.changes.regionText)}`);
  expect(conflicts).toEqual([]);
  expect(mockShowConflictDialog).not.toHaveBeenCalled();
  expect(mockServer.rows.get(REGION_ID)!.regionText.trim()).toBe(quill.getText().trim());
}

describe('region save race: spelling suggestion vs debounced typing save', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockServer.reset();
    mockQuills.clear();
    mockShowConflictDialog.mockClear();
    regionSaveManager.__clearAll();
    useEditorStore.getState().cleanup();
  });

  afterEach(() => {
    regionSaveManager.__clearAll();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('1. typing flush in flight, then suggestion click saves immediately', async () => {
    const quill = seed('awa');
    type(quill, ' tansi');
    await settle(3000); // debounce fires -> manager flush in flight
    expect(mockServer.calls).toHaveLength(1);

    await clickSuggestion(quill, 'tansi', 'tânisi'); // suggestion save waits for the typing save
    expect(mockServer.calls).toHaveLength(1);

    await release(0); // typing save lands, suggestion save starts after it
    expect(mockServer.calls).toHaveLength(2);
    expect(mockServer.calls[1].sentVersion).toBe(2);
    await drain();

    expectNoSelfConflict(quill);
  });

  it('2. suggestion save in flight, then fast typing flushes', async () => {
    const quill = seed('awa tansi');
    await clickSuggestion(quill, 'tansi', 'tânisi'); // suggestion save in flight
    expect(mockServer.calls).toHaveLength(1);
    expect(mockServer.calls[0].changes.regionText).toBe('awa tânisi');

    quill.cursor = quill.text.length;
    type(quill, ' kiya');
    await settle(3000); // typing flush waits for the suggestion save
    expect(mockServer.calls).toHaveLength(1);

    await release(0);
    expect(mockServer.calls).toHaveLength(2);
    expect(mockServer.calls[1].changes.regionText).toBe('awa tânisi kiya');
    await drain();

    expectNoSelfConflict(quill);
  });

  it('3. two suggestion clicks in quick succession', async () => {
    const quill = seed('tansi kiya');
    await clickSuggestion(quill, 'tansi', 'tânisi');
    await clickSuggestion(quill, 'kiya', 'kiyâ');
    expect(mockServer.calls).toHaveLength(1);

    await release(0);
    expect(mockServer.calls).toHaveLength(2);
    await drain();

    expectNoSelfConflict(quill);
  });

  it('never sends quill\'s trailing newline', async () => {
    const quill = seed('awa tansi');
    await clickSuggestion(quill, 'tansi', 'tânisi');
    await drain();

    for (const call of mockServer.calls) {
      expect(String(call.changes.regionText)).not.toMatch(/\n$/);
    }
  });
});

describe('region save queue: no lost changes + save indicator (R-SAVE-IND-1)', () => {
  const saveStatus = () => useEditorStore.getState().saveStatus;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    mockServer.reset();
    mockQuills.clear();
    mockShowConflictDialog.mockClear();
    regionSaveManager.__clearAll();
    useEditorStore.getState().cleanup();
    useEditorStore.getState().setSaveStatus('saved');
  });

  afterEach(() => {
    regionSaveManager.__clearAll();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('saves changes queued while a save is in flight (nothing lost)', async () => {
    const quill = seed('awa');
    type(quill, ' tansi');
    await settle(3000);
    expect(mockServer.calls).toHaveLength(1);

    type(quill, ' kiya'); // queued while the first save is in flight
    await settle(3000); // its flush waits behind the in-flight save
    expect(mockServer.calls).toHaveLength(1);

    await release(0);
    expect(mockServer.calls).toHaveLength(2);
    expect(mockServer.calls[1].sentVersion).toBe(2);
    await drain();

    expect(mockServer.rows.get(REGION_ID)!.regionText).toBe('awa tansi kiya');
    expect(mockShowConflictDialog).not.toHaveBeenCalled();
  });

  it('shows pending as soon as a change is queued: typing, suggestion click, analysis select', async () => {
    const quill = seed('awa tansi');

    type(quill, ' x');
    expect(saveStatus()).toBe('pending');
    await drain();
    expect(saveStatus()).toBe('saved');

    quill.cursor = quill.text.indexOf('tansi') + 1;
    await correctSpelling(REGION_ID, 'tansi', 'tânisi');
    expect(saveStatus()).toBe('pending');
    await drain();
    expect(saveStatus()).toBe('saved');

    regionSaveManager.queueAnalysisChange(REGION_ID, []);
    expect(saveStatus()).toBe('pending');
    await drain();
    expect(saveStatus()).toBe('saved');
  });

  it('stays pending while a change is queued behind an in-flight save, saved only after all drain', async () => {
    const quill = seed('awa');
    type(quill, ' tansi');
    await settle(3000);
    expect(saveStatus()).toBe('saving');

    type(quill, ' kiya');
    expect(saveStatus()).toBe('pending');

    await release(0); // first save lands; second still queued/in flight
    expect(saveStatus()).not.toBe('saved');

    await drain();
    expect(saveStatus()).toBe('saved');
    expect(regionSaveManager.hasAnyPendingSaves()).toBe(false);
  });

  it('stays dirty until saves for every region have landed', async () => {
    const quill = seed('awa');
    const otherRow: ServerRow = {
      id: 'region-2', transcriptionId: 'trans-1', regionText: 'kiya', start: 5, end: 9,
      _version: 1, userLastUpdated: 'me@example.com',
    };
    mockServer.rows.set('region-2', otherRow);
    services.storeService.addNewRegion({ ...otherRow } as unknown as RegionData);

    type(quill, ' tansi');
    regionSaveManager.queueTranslationChange('region-2', 'hello');
    await settle(3000);
    expect(mockServer.calls).toHaveLength(2);

    await release(0);
    expect(saveStatus()).not.toBe('saved');

    await release(1);
    expect(saveStatus()).toBe('saved');
  });
});

describe('region drags (bounds) share the per-region save queue', () => {
  const saveStatus = () => useEditorStore.getState().saveStatus;
  const user = { username: 'me@example.com', userId: 'u1' };

  function drag(start: number, end: number) {
    new UpdateRegionBounds({
      regionId: REGION_ID,
      newStart: start,
      newEnd: end,
      user,
      services,
      store: useEditorStore.getState(),
    }).execute();
  }

  function expectNoConflicts() {
    expect(mockServer.calls.filter((c) => c.outcome === 'conflict')).toEqual([]);
    expect(mockShowConflictDialog).not.toHaveBeenCalled();
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    mockServer.reset();
    mockQuills.clear();
    mockShowConflictDialog.mockClear();
    regionSaveManager.__clearAll();
    useEditorStore.getState().cleanup();
    useEditorStore.getState().setSaveStatus('saved');
  });

  afterEach(() => {
    regionSaveManager.__clearAll();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('drag while a text save is in flight: no conflict, both saved', async () => {
    const quill = seed('awa');
    type(quill, ' tansi');
    await settle(3000); // text save in flight
    expect(mockServer.calls).toHaveLength(1);

    drag(1, 4);
    expect(services.storeService.regionById(REGION_ID)!.start).toBe(1); // store updated right away
    await settle(2500); // bounds flush waits behind the text save
    expect(mockServer.calls).toHaveLength(1);

    await release(0);
    expect(mockServer.calls).toHaveLength(2);
    expect(mockServer.calls[1].changes).toMatchObject({ start: 1, end: 4 });
    expect(mockServer.calls[1].sentVersion).toBe(2);
    await drain();

    expectNoConflicts();
    expect(mockServer.rows.get(REGION_ID)).toMatchObject({ regionText: 'awa tansi', start: 1, end: 4 });
    expect(services.storeService.isPendingEdit(REGION_ID, 'bounds')).toBe(false);
  });

  it('typing while a drag save is in flight: no conflict, both saved', async () => {
    const quill = seed('awa');
    drag(1, 4);
    await settle(2500); // bounds save in flight
    expect(mockServer.calls).toHaveLength(1);

    type(quill, ' tansi');
    await settle(3000);
    expect(mockServer.calls).toHaveLength(1);

    await release(0);
    expect(mockServer.calls[1].sentVersion).toBe(2);
    await drain();

    expectNoConflicts();
    expect(mockServer.rows.get(REGION_ID)).toMatchObject({ regionText: 'awa tansi', start: 1, end: 4 });
  });

  it('text and drag queued together go out in one save', async () => {
    const quill = seed('awa');
    type(quill, ' tansi');
    drag(1, 4);
    await drain();

    expect(mockServer.calls).toHaveLength(1);
    expect(mockServer.calls[0].changes).toMatchObject({ regionText: 'awa tansi', start: 1, end: 4 });
    expectNoConflicts();
  });

  it('shows pending as soon as a region is dragged', async () => {
    seed('awa');
    drag(1, 4);
    expect(saveStatus()).toBe('pending');
    await settle(2500);
    expect(saveStatus()).toBe('saving');
    await drain();
    expect(saveStatus()).toBe('saved');
  });

  it('merge waits for the survivor save in flight, then saves at the next version', async () => {
    const quill = seed('awa');
    const absorbed: ServerRow = {
      id: 'region-2', transcriptionId: 'trans-1', regionText: 'kiya', start: 5, end: 9,
      _version: 1, userLastUpdated: 'me@example.com',
    };
    mockServer.rows.set('region-2', absorbed);
    services.storeService.addNewRegion({ ...absorbed } as unknown as RegionData);

    type(quill, ' tansi');
    await settle(3000); // survivor text save in flight
    expect(mockServer.calls).toHaveLength(1);

    const merged = new MergeRegionUseCase({
      survivorId: REGION_ID,
      absorbedId: 'region-2',
      transcriptionId: 'trans-1',
      user,
      services,
      store: useEditorStore.getState(),
    }).execute();
    await settle();
    expect(mockServer.calls).toHaveLength(1); // merge save waits

    await release(0);
    expect(mockServer.calls).toHaveLength(2);
    expect(mockServer.calls[1].sentVersion).toBe(2);
    expect(mockServer.calls[1].changes).toMatchObject({ regionText: 'awa tansi kiya', start: 0, end: 9 });
    await release(1);
    await merged;

    expectNoConflicts();
    expect(mockServer.rows.get(REGION_ID)).toMatchObject({ regionText: 'awa tansi kiya', start: 0, end: 9 });
    expect(mockServer.rows.has('region-2')).toBe(false);
  });
});

describe('non-conflict save failures are kept and retried', () => {
  const saveStatus = () => useEditorStore.getState().saveStatus;
  const user = { username: 'me@example.com', userId: 'u1' };

  function drag(start: number, end: number) {
    new UpdateRegionBounds({
      regionId: REGION_ID,
      newStart: start,
      newEnd: end,
      user,
      services,
      store: useEditorStore.getState(),
    }).execute();
  }

  async function fail(i: number) {
    mockServer.calls[i].fail();
    await settle();
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockServer.reset();
    mockQuills.clear();
    mockShowConflictDialog.mockClear();
    regionSaveManager.__clearAll();
    useEditorStore.getState().cleanup();
    useEditorStore.getState().setSaveStatus('saved');
  });

  afterEach(() => {
    regionSaveManager.__clearAll();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('drag save fails once: bounds stay, error shown, retry lands the new bounds', async () => {
    seed('awa');
    drag(1, 4);
    await settle(2500);
    expect(mockServer.calls).toHaveLength(1);

    await fail(0);
    expect(services.storeService.regionById(REGION_ID)).toMatchObject({ start: 1, end: 4 });
    expect(saveStatus()).toBe('error');
    expect(regionSaveManager.hasAnyPendingSaves()).toBe(true); // navigation guard blocks leaving

    await settle(1999);
    expect(mockServer.calls).toHaveLength(1);
    await settle(1); // first retry after 2s
    expect(mockServer.calls).toHaveLength(2);
    expect(mockServer.calls[1].changes).toMatchObject({ start: 1, end: 4 });
    expect(mockServer.calls[1].sentVersion).toBe(1);

    await release(1);
    expect(mockServer.rows.get(REGION_ID)).toMatchObject({ start: 1, end: 4 });
    expect(saveStatus()).toBe('saved');
    expect(regionSaveManager.hasAnyPendingSaves()).toBe(false);
    expect(services.storeService.isPendingEdit(REGION_ID, 'bounds')).toBe(false);
  });

  it('typing after a failed save: the next save sends the newest text', async () => {
    const quill = seed('awa');
    type(quill, ' tansi');
    await settle(3000);
    await fail(0);
    expect(saveStatus()).toBe('error');

    type(quill, ' kiya');
    expect(saveStatus()).toBe('error'); // still not saved

    await settle(3000);
    expect(mockServer.calls).toHaveLength(2);
    expect(mockServer.calls[1].changes.regionText).toBe('awa tansi kiya');

    await release(1);
    await settle(60_000);
    expect(mockServer.calls).toHaveLength(2);
    expect(mockServer.rows.get(REGION_ID)!.regionText).toBe('awa tansi kiya');
    expect(saveStatus()).toBe('saved');
  });

  it('failed retry merges under changes queued while it was in flight (newer wins)', async () => {
    const quill = seed('awa');
    type(quill, ' tansi');
    await settle(3000); // save in flight
    drag(1, 4);
    type(quill, ' kiya'); // queued behind it

    await fail(0); // queued flush (3s) not due yet; retry timer takes over
    await settle(2000);
    expect(mockServer.calls).toHaveLength(2);
    expect(mockServer.calls[1].changes).toMatchObject({ regionText: 'awa tansi kiya', start: 1, end: 4 });

    await release(1);
    expect(mockServer.rows.get(REGION_ID)).toMatchObject({ regionText: 'awa tansi kiya', start: 1, end: 4 });
    expect(saveStatus()).toBe('saved');
  });

  it('repeated failures back off: 2s, 4s, 8s, ... capped at 30s', async () => {
    seed('awa');
    drag(1, 4);
    await settle(2500);
    await fail(0);

    const delays = [2000, 4000, 8000, 16000, 30000, 30000];
    for (const [i, delay] of delays.entries()) {
      await settle(delay - 1);
      expect(mockServer.calls).toHaveLength(i + 1);
      await settle(1);
      expect(mockServer.calls).toHaveLength(i + 2);
      expect(saveStatus()).toBe('error');
      await fail(i + 1);
    }

    await settle(30_000);
    await release(delays.length + 1);
    expect(mockServer.rows.get(REGION_ID)).toMatchObject({ start: 1, end: 4 });
    expect(saveStatus()).toBe('saved');
  });

  it('version conflict still opens the dialog and is not retried', async () => {
    const quill = seed('awa');
    Object.assign(mockServer.rows.get(REGION_ID)!, {
      regionText: 'their text', _version: 2, userLastUpdated: 'them@example.com',
    });

    type(quill, ' tansi');
    await settle(3000);
    await release(0);
    expect(mockServer.calls[0].outcome).toBe('conflict');
    expect(mockShowConflictDialog).toHaveBeenCalledTimes(1);

    await settle(60_000);
    expect(mockServer.calls).toHaveLength(1);
    expect(saveStatus()).not.toBe('error');
  });

  it('deleting a region drops a failed save instead of retrying it', async () => {
    seed('awa');
    drag(1, 4);
    await settle(2500); // save in flight
    const cancelled = regionSaveManager.cancelPendingSaves(REGION_ID);
    await fail(0);
    await cancelled;

    await settle(60_000);
    expect(mockServer.calls).toHaveLength(1);
    expect(regionSaveManager.hasAnyPendingSaves()).toBe(false);
    expect(saveStatus()).not.toBe('error');
  });
});
