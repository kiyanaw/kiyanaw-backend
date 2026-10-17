/**
 * @jest-environment node
 */
import 'fake-indexeddb/auto';
import { localDb, countProjects } from './localDbService';
import * as localTranscriptionService from './localTranscriptionService';
import * as localRegionService from './localRegionService';
import { TranscriptionModel, RegionModel } from './adt';

const project = {
  id: 'p1',
  title: 'Elder interview',
  mediaName: 'interview.mp4',
  mediaType: 'video/mp4',
  isVideo: true,
  length: 3600,
  regionCount: 0,
  coverage: 0,
  createdAt: '2026-10-17T12:00:00.000Z',
  dateLastUpdated: '2026-10-17T12:00:00.000Z',
};

beforeEach(async () => {
  await Promise.all([localDb.projects.clear(), localDb.regions.clear(), localDb.peaks.clear()]);
});

describe('localTranscriptionService', () => {
  it('creates a project owned by this device and loads it in full', async () => {
    const created = await localTranscriptionService.createLocalProject(project, { length: 2, data: [-1, 1, -0.5, 0.5] });
    expect(created).toBeInstanceOf(TranscriptionModel);
    expect(created.author).toBe(localTranscriptionService.LOCAL_USER.userId);
    expect(created.accessLevel).toBe('owner');
    expect(await countProjects()).toBe(1);

    const loaded = await localTranscriptionService.loadInFull('p1');
    expect(loaded).not.toBe(false);
    if (loaded === false) return;
    expect(loaded.transcription.title).toBe('Elder interview');
    expect(loaded.transcription.source).toBe('local-media:p1');
    expect(loaded.transcription.isVideo).toBe(true);
    expect(loaded.peaks).toEqual([-1, 1, -0.5, 0.5]);
    expect(loaded.peaksDuration).toBe(0.1);
    expect(loaded.regions).toEqual([]);
    expect(loaded.issues).toEqual([]);
    expect(loaded.comments).toEqual([]);
  });

  it('reports a missing project as not found', async () => {
    expect(await localTranscriptionService.loadInFull('nope')).toBe(false);
  });

  it('updates the title and metadata', async () => {
    await localTranscriptionService.createLocalProject(project, { length: 1, data: [0, 0] });
    const updated = await localTranscriptionService.updateTranscription('p1', {
      title: 'Renamed',
      regionCount: 3,
      coverage: 42,
      userLastUpdated: 'local',
    });
    expect(updated.title).toBe('Renamed');
    expect(updated.regionCount).toBe(3);
    expect(updated.coverage).toBe(42);
    const list = await localTranscriptionService.listLocalTranscriptions();
    expect(list.map((t) => t.title)).toEqual(['Renamed']);
  });

  it('fails when updating a project that does not exist', async () => {
    await expect(
      localTranscriptionService.updateTranscription('nope', { title: 'x', userLastUpdated: 'local' })
    ).rejects.toThrow('not found');
  });

  it('has no expiring credentials', () => {
    expect(localTranscriptionService.getSignedUrlExpirationTime()).toBeNull();
  });
});

describe('localRegionService', () => {
  it('creates, updates, reloads and deletes regions', async () => {
    const created = await localRegionService.createRegion('p1', { id: 'r1', start: 1, end: 2.5 }, 'local');
    expect(created).toBeInstanceOf(RegionModel);
    expect(created._version).toBe(1);

    await localRegionService.updateRegion('r1', { regionText: 'tânisi', translation: 'hello' }, 'local', 1);
    // A stale version is fine: this device is the only writer.
    await localRegionService.updateRegion('r1', { end: 3 }, 'local', 1);

    const [region] = await localRegionService.loadRegionsForTranscription('p1');
    expect(region.regionText).toBe('tânisi');
    expect(region.translation).toBe('hello');
    expect(region.end).toBe(3);
    expect(region._version).toBe(3);
    expect(region.transcriptionId).toBe('p1');

    await localRegionService.deleteRegion('r1');
    expect(await localRegionService.getRegion('r1')).toBeNull();
  });

  it('does not persist spelling suggestions', async () => {
    await localRegionService.createRegion('p1', { id: 'r1', start: 0, end: 1 }, 'local');
    await localRegionService.updateRegion(
      'r1',
      { regionSuggestions: [{ word: 'x', allSuggestions: [] }] },
      'local',
      1
    );
    expect(await localRegionService.getRegion('r1')).not.toHaveProperty('regionSuggestions');
  });

  it('fails to update or delete a region that does not exist', async () => {
    await expect(localRegionService.updateRegion('nope', { end: 1 }, 'local', 1)).rejects.toThrow('not found');
    await expect(localRegionService.deleteRegion('nope')).rejects.toThrow('not found');
  });

  it('returns regions sorted by start time, like the cloud service', async () => {
    await localRegionService.createRegion('p1', { id: 'late', start: 7, end: 9 }, 'local');
    await localRegionService.createRegion('p1', { id: 'early', start: 1, end: 3 }, 'local');
    expect((await localRegionService.loadRegionsForTranscription('p1')).map((r) => r.id)).toEqual(['early', 'late']);
  });

  it('only loads regions for the requested project', async () => {
    await localRegionService.createRegion('p1', { id: 'a', start: 0, end: 1 }, 'local');
    await localRegionService.createRegion('p2', { id: 'b', start: 0, end: 1 }, 'local');
    expect((await localRegionService.loadRegionsForTranscription('p1')).map((r) => r.id)).toEqual(['a']);
  });
});
