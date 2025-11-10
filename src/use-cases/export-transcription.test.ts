import { ExportTranscriptionUseCase, type ExportRegion } from './export-transcription';

const buildTranscription = () =>
  ({
    title: 'My Transcription',
    id: 'transcription-1',
    getSourceFilename: () => 'original-file.mp3',
  }) as unknown as import('../services/adt').TranscriptionModel;

const buildRegion = (overrides: Partial<ExportRegion> = {}) =>
  ({
    id: 'region-1',
    start: 0,
    end: 2.5,
    isNote: false,
    regionText: 'Hello there',
    translation: 'Bonjour',
    ...overrides,
  }) as import('../services/adt').RegionModel;

describe('ExportTranscriptionUseCase', () => {
  it('includes numbering, timestamps, and translation when options enabled', () => {
    const useCase = new ExportTranscriptionUseCase({
      transcription: buildTranscription(),
      regions: [
        buildRegion({ start: 0, end: 1.2, regionText: 'First region', translation: 'Première région' }),
        buildRegion({ id: 'region-2', start: 2.5, end: 5, regionText: 'Second region', translation: 'Deuxième région' }),
      ],
      options: {
        includeRegionNumbers: true,
        includeTimestamps: true,
        includeTranslation: true,
      },
    });

    const { content, filename } = useCase.execute();

    expect(filename).toBe('original-file.txt');
    expect(content).toMatchInlineSnapshot(`
"1
00:00:00,000 --> 00:00:01,200
First region
Première région

2
00:00:02,500 --> 00:00:05,000
Second region
Deuxième région"
`);
  });

  it('omits timestamps and translation when disabled', () => {
    const useCase = new ExportTranscriptionUseCase({
      transcription: buildTranscription(),
      regions: [
        buildRegion({ regionText: 'Only text', translation: 'should be excluded' }),
      ],
      options: {
        includeRegionNumbers: true,
        includeTimestamps: false,
        includeTranslation: false,
      },
    });

    const { content } = useCase.execute();

    expect(content).toBe(`1
Only text`);
  });

  it('derives filename from fallback when source filename is missing', () => {
    const transcription = {
      title: 'Sample Title',
      id: 'fallback-id',
      getSourceFilename: () => 'Unknown',
    } as unknown as import('../services/adt').TranscriptionModel;

    const useCase = new ExportTranscriptionUseCase({
      transcription,
      regions: [buildRegion()],
      options: {
        includeRegionNumbers: false,
        includeTimestamps: false,
        includeTranslation: false,
      },
    });

    const { filename } = useCase.execute();
    expect(filename).toBe('Sample Title.txt');
  });

  it('throws when all regions are notes', () => {
    const useCase = new ExportTranscriptionUseCase({
      transcription: buildTranscription(),
      regions: [buildRegion({ isNote: true })],
      options: {
        includeRegionNumbers: true,
        includeTimestamps: true,
        includeTranslation: true,
      },
    });

    expect(() => useCase.execute()).toThrow('There are no transcription regions with text to export.');
  });

  it('keeps regions without text when other options are enabled', () => {
    const useCase = new ExportTranscriptionUseCase({
      transcription: buildTranscription(),
      regions: [
        buildRegion({ regionText: '', translation: '', start: 1, end: 2 }),
        buildRegion({ id: 'region-2', regionText: 'Content', translation: '', start: 3, end: 4 }),
      ],
      options: {
        includeRegionNumbers: true,
        includeTimestamps: true,
        includeTranslation: true,
      },
    });

    const { content } = useCase.execute();

    expect(content).toBe(`1
00:00:01,000 --> 00:00:02,000

2
00:00:03,000 --> 00:00:04,000
Content`);
  });
});

