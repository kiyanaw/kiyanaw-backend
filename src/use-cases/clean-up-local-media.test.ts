import { CleanUpLocalMediaUseCase } from './clean-up-local-media';

const makeServices = ({ media, projects, creating }: { media: string[]; projects: string[]; creating: string[] }) => ({
  localMediaService: {
    listMediaIds: jest.fn().mockResolvedValue(media),
    idsBeingCreated: jest.fn().mockResolvedValue(creating),
    deleteMedia: jest.fn().mockResolvedValue(undefined),
    withCleanupLock: <T>(work: () => Promise<T>) => work(),
  },
  localTranscriptionService: {
    listProjectIds: jest.fn().mockResolvedValue(projects),
  },
});

describe('CleanUpLocalMediaUseCase', () => {
  it('deletes media with no project that is not being created', async () => {
    const services = makeServices({ media: ['kept', 'orphan', 'in-progress'], projects: ['kept'], creating: ['in-progress'] });
    const removed = await new CleanUpLocalMediaUseCase({ services }).execute();
    expect(removed).toEqual(['orphan']);
    expect(services.localMediaService.deleteMedia).toHaveBeenCalledTimes(1);
    expect(services.localMediaService.deleteMedia).toHaveBeenCalledWith('orphan');
  });

  it('does nothing when every media file belongs to a project', async () => {
    const services = makeServices({ media: ['a'], projects: ['a', 'b'], creating: [] });
    expect(await new CleanUpLocalMediaUseCase({ services }).execute()).toEqual([]);
    expect(services.localMediaService.deleteMedia).not.toHaveBeenCalled();
  });
});
