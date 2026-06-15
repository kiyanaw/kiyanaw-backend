import { DeleteTranscriptionUseCase } from './delete-transcription';

jest.mock('../services/transcriptionService', () => ({
  deleteTranscription: jest.fn(),
  deleteTranscriptionFiles: jest.fn(),
}));

jest.mock('../services/mediaService', () => ({
  deleteMedia: jest.fn(),
}));

jest.mock('../services/userService', () => ({
  currentUser: jest.fn().mockReturnValue({ userId: 'user-123' }),
}));

import { deleteTranscription, deleteTranscriptionFiles } from '../services/transcriptionService';
import { deleteMedia } from '../services/mediaService';

const mockDeleteTranscription = deleteTranscription as jest.Mock;
const mockDeleteTranscriptionFiles = deleteTranscriptionFiles as jest.Mock;
const mockDeleteMedia = deleteMedia as jest.Mock;

const mockDeleted = { id: 'trans-1', title: 'Test' };

describe('DeleteTranscriptionUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteTranscription.mockResolvedValue(mockDeleted);
    mockDeleteTranscriptionFiles.mockResolvedValue(undefined);
    mockDeleteMedia.mockResolvedValue(undefined);
  });

  it('deletes the transcription record', async () => {
    const useCase = new DeleteTranscriptionUseCase({ transcriptionId: 'trans-1' });
    await useCase.execute();
    expect(mockDeleteTranscription).toHaveBeenCalledWith('trans-1');
  });

  it('calls deleteMedia when transcription has mediaId', async () => {
    const useCase = new DeleteTranscriptionUseCase({
      transcriptionId: 'trans-1',
      transcription: { mediaId: 'media-abc' },
    });
    await useCase.execute();
    expect(mockDeleteMedia).toHaveBeenCalledWith('media-abc');
    expect(mockDeleteTranscriptionFiles).not.toHaveBeenCalled();
  });

  it('calls deleteTranscriptionFiles when transcription has source (legacy)', async () => {
    const useCase = new DeleteTranscriptionUseCase({
      transcriptionId: 'trans-1',
      transcription: { source: 'https://bucket.s3.amazonaws.com/public/file.mp3' },
    });
    await useCase.execute();
    expect(mockDeleteTranscriptionFiles).toHaveBeenCalledWith('https://bucket.s3.amazonaws.com/public/file.mp3');
    expect(mockDeleteMedia).not.toHaveBeenCalled();
  });

  it('does no file cleanup when transcription has neither source nor mediaId', async () => {
    const useCase = new DeleteTranscriptionUseCase({
      transcriptionId: 'trans-1',
      transcription: {},
    });
    await useCase.execute();
    expect(mockDeleteMedia).not.toHaveBeenCalled();
    expect(mockDeleteTranscriptionFiles).not.toHaveBeenCalled();
  });

  it('still deletes the transcription record even if media cleanup fails', async () => {
    mockDeleteMedia.mockRejectedValue(new Error('cleanup failed'));
    const useCase = new DeleteTranscriptionUseCase({
      transcriptionId: 'trans-1',
      transcription: { mediaId: 'media-abc' },
    });
    await useCase.execute();
    expect(mockDeleteTranscription).toHaveBeenCalledWith('trans-1');
  });

  it('returns the deleted transcription', async () => {
    const useCase = new DeleteTranscriptionUseCase({ transcriptionId: 'trans-1' });
    const result = await useCase.execute();
    expect(result).toEqual({ success: true, deletedTranscription: mockDeleted });
  });
});
