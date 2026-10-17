import { CreateLocalProjectUseCase, type CreateLocalProjectInput } from './create-local-project';

const makeServices = () => ({
  localMediaService: {
    putMedia: jest.fn().mockResolvedValue(undefined),
    deleteMedia: jest.fn().mockResolvedValue(undefined),
  },
  localPeaksService: {
    computePeaks: jest.fn().mockResolvedValue({ data: [-1, 1], length: 1, duration: 0.05, hasVideo: true }),
  },
  localTranscriptionService: {
    createLocalProject: jest.fn().mockResolvedValue({ id: 'p1' }),
  },
});

const makeInput = (overrides: Partial<CreateLocalProjectInput> = {}, services = makeServices()) => ({
  title: '  Elder interview ',
  file: new File([new Uint8Array([1, 2, 3])], 'interview.mp4', { type: 'video/mp4' }),
  services: services as unknown as CreateLocalProjectInput['services'],
  newId: () => 'p1',
  now: () => '2026-10-17T12:00:00.000Z',
  ...overrides,
});

describe('CreateLocalProjectUseCase', () => {
  it('computes peaks, stores the media, then creates the project', async () => {
    const services = makeServices();
    await new CreateLocalProjectUseCase(makeInput({}, services)).execute();

    expect(services.localPeaksService.computePeaks).toHaveBeenCalledTimes(1);
    expect(services.localMediaService.putMedia).toHaveBeenCalledWith('p1', expect.any(File));
    expect(services.localTranscriptionService.createLocalProject).toHaveBeenCalledWith(
      {
        id: 'p1',
        title: 'Elder interview',
        mediaName: 'interview.mp4',
        mediaType: 'video/mp4',
        isVideo: true,
        length: 0.05,
        regionCount: 0,
        coverage: 0,
        createdAt: '2026-10-17T12:00:00.000Z',
        dateLastUpdated: '2026-10-17T12:00:00.000Z',
      },
      { length: 1, data: [-1, 1] }
    );
  });

  it('stores nothing when the browser cannot decode the file', async () => {
    const services = makeServices();
    services.localPeaksService.computePeaks.mockRejectedValue(new Error("This browser can't decode the file's audio"));

    await expect(new CreateLocalProjectUseCase(makeInput({}, services)).execute()).rejects.toThrow("can't decode");
    expect(services.localMediaService.putMedia).not.toHaveBeenCalled();
    expect(services.localTranscriptionService.createLocalProject).not.toHaveBeenCalled();
  });

  it('removes the stored media if saving the project fails', async () => {
    const services = makeServices();
    services.localTranscriptionService.createLocalProject.mockRejectedValue(new Error('QuotaExceededError'));

    await expect(new CreateLocalProjectUseCase(makeInput({}, services)).execute()).rejects.toThrow('QuotaExceededError');
    expect(services.localMediaService.deleteMedia).toHaveBeenCalledWith('p1');
  });

  it.each([
    [{ title: '   ' }, 'Title is required'],
    [{ file: new File([], 'empty.mp3') }, 'The file is empty'],
  ])('validates input %#', async (overrides, message) => {
    const services = makeServices();
    await expect(new CreateLocalProjectUseCase(makeInput(overrides, services)).execute()).rejects.toThrow(message);
    expect(services.localPeaksService.computePeaks).not.toHaveBeenCalled();
  });
});
