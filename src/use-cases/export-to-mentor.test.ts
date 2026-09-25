import { ExportToMentorUseCase, type ExportToMentorInput } from './export-to-mentor';
import type { ExportRegion } from './export-transcription';

jest.mock('../services/exportService', () => ({
  createExport: jest.fn(),
}));

import { createExport } from '../services/exportService';

const mockCreateExport = createExport as jest.MockedFunction<typeof createExport>;

const region = (over: Partial<ExportRegion> = {}): ExportRegion => ({
  id: 'r1', start: 0, end: 1, isNote: false, regionText: 'Taanshi', translation: 'Hello', ...over,
});

const baseInput = (over: Partial<ExportToMentorInput> = {}): ExportToMentorInput => ({
  transcriptionId: 'T1',
  ownerSub: 'owner-sub',
  isOwner: true,
  speaker: 'Terry Ireland',
  regions: [region()],
  ...over,
});

describe('ExportToMentorUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('validate', () => {
    it('rejects a non-owner', () => {
      const uc = new ExportToMentorUseCase(baseInput({ isOwner: false }));
      expect(() => uc.validate()).toThrow('Only the transcription owner can export.');
    });

    it('rejects a blank speaker', () => {
      const uc = new ExportToMentorUseCase(baseInput({ speaker: '   ' }));
      expect(() => uc.validate()).toThrow('A speaker name is required.');
    });

    it('rejects when no region has exportable text', () => {
      const uc = new ExportToMentorUseCase(baseInput({
        regions: [
          region({ id: 'note', isNote: true }),
          region({ id: 'empty', regionText: '', translation: '  ' }),
        ],
      }));
      expect(() => uc.validate()).toThrow('There are no regions with text to export.');
    });

    it('rejects a missing transcription id', () => {
      const uc = new ExportToMentorUseCase(baseInput({ transcriptionId: '' }));
      expect(() => uc.validate()).toThrow('Transcription ID is required.');
    });

    it('passes for a valid owner request', () => {
      const uc = new ExportToMentorUseCase(baseInput());
      expect(() => uc.validate()).not.toThrow();
    });
  });

  describe('execute', () => {
    it('creates a PENDING export with a trimmed speaker', async () => {
      mockCreateExport.mockResolvedValue({
        id: 'exp-1', transcriptionId: 'T1', owner: 'owner-sub', status: 'PENDING',
      });

      const uc = new ExportToMentorUseCase(baseInput({ speaker: '  Terry Ireland  ' }));
      await uc.execute();

      expect(mockCreateExport).toHaveBeenCalledWith({
        transcriptionId: 'T1',
        owner: 'owner-sub',
        speaker: 'Terry Ireland',
      });
    });

    it('does not call the service when validation fails', async () => {
      const uc = new ExportToMentorUseCase(baseInput({ isOwner: false }));
      await expect(uc.execute()).rejects.toThrow('Only the transcription owner can export.');
      expect(mockCreateExport).not.toHaveBeenCalled();
    });
  });
});
