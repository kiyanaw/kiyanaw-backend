import { renderHook, act } from '@testing-library/react';
import { useExportTranscription } from './useExportTranscription';
import { ExportTranscriptionUseCase } from '../use-cases/export-transcription';

jest.mock('../use-cases/export-transcription');

const MockedExportTranscriptionUseCase = ExportTranscriptionUseCase as jest.MockedClass<typeof ExportTranscriptionUseCase>;

const buildTranscription = () =>
  ({
    title: 'Example Transcription',
    id: 'transcription-1',
    getSourceFilename: () => 'example.mp3',
  }) as unknown as import('../services/adt').TranscriptionModel;

const buildRegion = () => ({
  id: 'region-1',
  start: 0,
  end: 1,
  isNote: false,
  regionText: 'Hello',
  translation: 'Bonjour',
});

describe('useExportTranscription', () => {
  let createObjectURLMock: jest.Mock;
  let revokeObjectURLMock: jest.Mock;
  let appendChildSpy: jest.SpyInstance;
  let removeChildSpy: jest.SpyInstance;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalAppendChild = document.body.appendChild;
  const originalRemoveChild = document.body.removeChild;

  beforeEach(() => {
    jest.resetAllMocks();

    createObjectURLMock = jest.fn().mockReturnValue('blob:url');
    revokeObjectURLMock = jest.fn();

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURLMock,
    });

    appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((child) =>
      originalAppendChild.call(document.body, child)
    );
    removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation((child) =>
      originalRemoveChild.call(document.body, child)
    );

    MockedExportTranscriptionUseCase.mockImplementation(
      () =>
        ({
          execute: () => ({
            filename: 'example.txt',
            content: 'Generated content',
          }),
        }) as unknown as ExportTranscriptionUseCase
    );
  });

  afterEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: originalCreateObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: originalRevokeObjectURL,
    });

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('creates and triggers a download using the export use case result', async () => {
    const { result } = renderHook(() => useExportTranscription());
    const initialAppendCalls = appendChildSpy.mock.calls.length;
    const initialRemoveCalls = removeChildSpy.mock.calls.length;

    await act(async () => {
      await result.current({
        transcription: buildTranscription(),
        regions: [buildRegion()],
        options: {
          includeRegionNumbers: true,
          includeTimestamps: true,
          includeTranslation: true,
        },
      });
    });

    expect(MockedExportTranscriptionUseCase).toHaveBeenCalledWith({
      transcription: expect.any(Object),
      regions: expect.any(Array),
      options: {
        includeRegionNumbers: true,
        includeTimestamps: true,
        includeTranslation: true,
      },
    });

    expect(createObjectURLMock).toHaveBeenCalledWith(expect.any(Blob));
    expect(appendChildSpy.mock.calls.length).toBe(initialAppendCalls + 1);
    expect(removeChildSpy.mock.calls.length).toBe(initialRemoveCalls + 1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:url');

    const anchor = appendChildSpy.mock.calls[appendChildSpy.mock.calls.length - 1][0] as HTMLAnchorElement;
    expect(anchor.download).toBe('example.txt');
    expect(anchor.href).toBe('blob:url');
  });

  it('propagates errors from the use case', async () => {
    const failure = new Error('failed to export');
    MockedExportTranscriptionUseCase.mockImplementation(
      () =>
        ({
          execute: () => {
            throw failure;
          },
        }) as unknown as ExportTranscriptionUseCase
    );

    const { result } = renderHook(() => useExportTranscription());
    const initialAppendCalls = appendChildSpy.mock.calls.length;
    const initialRemoveCalls = removeChildSpy.mock.calls.length;

    await expect(
      act(async () => {
        await result.current({
          transcription: buildTranscription(),
          regions: [buildRegion()],
          options: {
            includeRegionNumbers: false,
            includeTimestamps: false,
            includeTranslation: false,
          },
        });
      })
    ).rejects.toThrow(failure);

    expect(createObjectURLMock).not.toHaveBeenCalled();
    expect(appendChildSpy.mock.calls.length).toBe(initialAppendCalls);
    expect(removeChildSpy.mock.calls.length).toBe(initialRemoveCalls);
    expect(revokeObjectURLMock).not.toHaveBeenCalled();
  });
});

