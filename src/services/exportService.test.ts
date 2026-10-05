import {
  createExport,
  getExportByTranscription,
  deleteExport,
  getExportDownloadUrl,
  EXPORT_STATUS,
  __resetClient,
  type ExportData,
} from './exportService';

jest.mock('aws-amplify/api', () => ({
  generateClient: jest.fn(),
}));

jest.mock('aws-amplify/storage', () => ({
  remove: jest.fn(),
}));

jest.mock('./transcriptionService', () => ({
  generateSignedUrlFromKey: jest.fn(),
}));

import { generateClient } from 'aws-amplify/api';
import { remove } from 'aws-amplify/storage';
import { generateSignedUrlFromKey } from './transcriptionService';

const mockRemove = remove as jest.MockedFunction<typeof remove>;
const mockSignedUrl = generateSignedUrlFromKey as jest.MockedFunction<typeof generateSignedUrlFromKey>;
const mockGraphql = jest.fn();
const mockClient = { graphql: mockGraphql };
(generateClient as jest.Mock).mockReturnValue(mockClient);

describe('exportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetClient();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    (generateClient as jest.Mock).mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getExportByTranscription', () => {
    it('returns the live export from the GSI query', async () => {
      const record: ExportData = {
        id: 'exp-1', transcriptionId: 'T1', owner: 'u1', status: EXPORT_STATUS.READY, downloadKey: 'public/exports/T1.zip',
      };
      mockGraphql.mockResolvedValue({ data: { exportsByTranscription: { items: [record] } } });

      const result = await getExportByTranscription('T1');

      expect(result).toEqual(record);
      expect(mockGraphql).toHaveBeenCalledWith(expect.objectContaining({ variables: { transcriptionId: 'T1' } }));
    });

    it('filters out soft-deleted tombstones', async () => {
      mockGraphql.mockResolvedValue({ data: { exportsByTranscription: { items: [
        { id: 'old', transcriptionId: 'T1', owner: 'u1', status: EXPORT_STATUS.READY, _deleted: true, _version: 3 },
      ] } } });
      expect(await getExportByTranscription('T1')).toBeNull();
    });

    it('returns null when none exists', async () => {
      mockGraphql.mockResolvedValue({ data: { exportsByTranscription: { items: [] } } });
      expect(await getExportByTranscription('T1')).toBeNull();
    });
  });

  describe('createExport', () => {
    it('creates a PENDING export with an auto-generated id (no id sent)', async () => {
      const created: ExportData = {
        id: 'exp-1', transcriptionId: 'T1', owner: 'u1', status: EXPORT_STATUS.PENDING, speaker: 'Terry',
      };
      mockGraphql.mockResolvedValue({ data: { createExport: created } });

      const result = await createExport({ transcriptionId: 'T1', owner: 'u1', speaker: 'Terry' });

      expect(result).toEqual(created);
      const call = mockGraphql.mock.calls[0][0];
      expect(call.variables.input).toMatchObject({
        transcriptionId: 'T1',
        owner: 'u1',
        speaker: 'Terry',
        status: EXPORT_STATUS.PENDING,
      });
      // The id must NOT be sent — AppSync generates it, so tombstones can't collide.
      expect(call.variables.input.id).toBeUndefined();
      expect(call.authMode).toBe('userPool');
    });

    it('throws when creation returns no record', async () => {
      mockGraphql.mockResolvedValue({ data: { createExport: null } });
      await expect(createExport({ transcriptionId: 'T1', owner: 'u1', speaker: 'x' }))
        .rejects.toThrow('Failed to create Export record');
    });
  });

  describe('deleteExport', () => {
    it('removes the S3 zip then deletes the record with its version', async () => {
      mockRemove.mockResolvedValue({ path: 'public/exports/T1.zip' } as never);
      mockGraphql.mockResolvedValue({ data: { deleteExport: { id: 'T1' } } });

      await deleteExport({
        id: 'exp-1', transcriptionId: 'T1', owner: 'u1', status: EXPORT_STATUS.READY,
        downloadKey: 'public/exports/T1.zip', _version: 3,
      });

      expect(mockRemove).toHaveBeenCalledWith({ path: 'public/exports/T1.zip' });
      expect(mockGraphql).toHaveBeenCalledWith(expect.objectContaining({
        variables: { input: { id: 'exp-1', _version: 3 } },
      }));
    });

    it('skips S3 removal when there is no downloadKey', async () => {
      mockGraphql.mockResolvedValue({ data: { deleteExport: { id: 'exp-1' } } });

      await deleteExport({ id: 'exp-1', transcriptionId: 'T1', owner: 'u1', status: EXPORT_STATUS.PENDING });

      expect(mockRemove).not.toHaveBeenCalled();
      expect(mockGraphql).toHaveBeenCalled();
    });
  });

  describe('getExportDownloadUrl', () => {
    it('delegates to generateSignedUrlFromKey', async () => {
      mockSignedUrl.mockResolvedValue('https://signed.example/zip');
      const url = await getExportDownloadUrl('public/exports/T1.zip');
      expect(url).toBe('https://signed.example/zip');
      expect(mockSignedUrl).toHaveBeenCalledWith('public/exports/T1.zip');
    });
  });
});
