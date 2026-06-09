import { createMedia, getMedia, deleteMedia, subscribeToMediaChanges, __resetClient } from './mediaService';

jest.mock('aws-amplify/api', () => ({
  generateClient: jest.fn(),
}));

jest.mock('aws-amplify/storage', () => ({
  remove: jest.fn(),
}));

jest.mock('../graphql/mutations.js', () => ({
  createMedia: 'mock-create-media-mutation',
  deleteMedia: 'mock-delete-media-mutation',
}));

jest.mock('../graphql/queries.js', () => ({
  getMedia: 'mock-get-media-query',
}));

jest.mock('../graphql/subscriptions.js', () => ({
  onUpdateMedia: 'mock-on-update-media-subscription',
}));

import { generateClient } from 'aws-amplify/api';
import { remove } from 'aws-amplify/storage';

const mockRemove = remove as jest.MockedFunction<typeof remove>;
const mockGraphql = jest.fn();
const mockClient = { graphql: mockGraphql };
(generateClient as jest.Mock).mockReturnValue(mockClient);

describe('mediaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetClient();
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createMedia', () => {
    const params = {
      id: 'media-123',
      owner: 'user-abc',
      originalKey: 'public/originals/media-123.mp3',
      mimeType: 'audio/mpeg',
      fileSize: 1024000,
    };

    const mockCreated = {
      id: 'media-123',
      pk: 'USER#user-abc',
      sk: 'MEDIA#0000-00-00#media-123',
      owner: 'user-abc',
      status: 'PENDING',
      originalKey: 'public/originals/media-123.mp3',
      mimeType: 'audio/mpeg',
      fileSize: 1024000,
    };

    it('should call createMedia mutation with correct pk, sk, status=PENDING', async () => {
      mockGraphql.mockResolvedValue({ data: { createMedia: mockCreated } });

      const result = await createMedia(params);

      expect(mockGraphql).toHaveBeenCalledWith({
        query: 'mock-create-media-mutation',
        variables: {
          input: {
            id: 'media-123',
            pk: 'USER#user-abc',
            sk: 'MEDIA#0000-00-00#media-123',
            owner: 'user-abc',
            status: 'PENDING',
            originalKey: 'public/originals/media-123.mp3',
            mimeType: 'audio/mpeg',
            fileSize: 1024000,
          },
        },
        authMode: 'userPool',
      });

      expect(result).toEqual(mockCreated);
    });

    it('should include recordedAt in sk when provided', async () => {
      mockGraphql.mockResolvedValue({ data: { createMedia: mockCreated } });

      await createMedia({ ...params, recordedAt: '2024-01-15' });

      const input = mockGraphql.mock.calls[0][0].variables.input;
      expect(input.sk).toBe('MEDIA#2024-01-15#media-123');
    });

    it('should throw when mutation returns no data', async () => {
      mockGraphql.mockResolvedValue({ data: { createMedia: null } });

      await expect(createMedia(params)).rejects.toThrow();
    });

    it('should propagate GraphQL errors', async () => {
      mockGraphql.mockRejectedValue(new Error('Network error'));

      await expect(createMedia(params)).rejects.toThrow('Network error');
    });
  });

  describe('getMedia', () => {
    const mockMedia = {
      id: 'media-123',
      status: 'READY',
      renditionKey: 'public/renditions/media-123.mp3',
      peaksKey: 'public/peaks/media-123.json',
      thumbnailKey: null,
    };

    it('should fetch media by id', async () => {
      mockGraphql.mockResolvedValue({ data: { getMedia: mockMedia } });

      const result = await getMedia('media-123');

      expect(mockGraphql).toHaveBeenCalledWith({
        query: 'mock-get-media-query',
        variables: { id: 'media-123' },
      });

      expect(result).toEqual(mockMedia);
    });

    it('should throw when media not found', async () => {
      mockGraphql.mockResolvedValue({ data: { getMedia: null } });

      await expect(getMedia('missing-id')).rejects.toThrow();
    });

    it('should propagate GraphQL errors', async () => {
      mockGraphql.mockRejectedValue(new Error('Auth error'));

      await expect(getMedia('media-123')).rejects.toThrow('Auth error');
    });
  });

  describe('deleteMedia', () => {
    const mockMediaFull = {
      id: 'media-123',
      _version: 2,
      originalKey: 'public/originals/media-123.mp3',
      renditionKey: 'public/renditions/media-123.mp3',
      peaksKey: 'public/peaks/media-123.json',
      thumbnailKey: null,
    };

    beforeEach(() => {
      mockRemove.mockResolvedValue({} as any);
    });

    it('should fetch the record, delete S3 files, then delete the DDB record', async () => {
      mockGraphql
        .mockResolvedValueOnce({ data: { getMedia: mockMediaFull } })
        .mockResolvedValueOnce({ data: { deleteMedia: { id: 'media-123' } } });

      await deleteMedia('media-123');

      expect(mockRemove).toHaveBeenCalledWith({ path: 'public/originals/media-123.mp3' });
      expect(mockRemove).toHaveBeenCalledWith({ path: 'public/renditions/media-123.mp3' });
      expect(mockRemove).toHaveBeenCalledWith({ path: 'public/peaks/media-123.json' });

      expect(mockGraphql).toHaveBeenLastCalledWith({
        query: 'mock-delete-media-mutation',
        variables: { input: { id: 'media-123', _version: 2 } },
        authMode: 'userPool',
      });
    });

    it('should skip null file keys', async () => {
      const noRendition = { ...mockMediaFull, renditionKey: null, peaksKey: null };
      mockGraphql
        .mockResolvedValueOnce({ data: { getMedia: noRendition } })
        .mockResolvedValueOnce({ data: { deleteMedia: { id: 'media-123' } } });

      await deleteMedia('media-123');

      expect(mockRemove).toHaveBeenCalledTimes(1);
      expect(mockRemove).toHaveBeenCalledWith({ path: 'public/originals/media-123.mp3' });
    });

    it('should delete thumbnailKey when present (video)', async () => {
      const withThumb = { ...mockMediaFull, thumbnailKey: 'public/thumbnails/media-123.jpg' };
      mockGraphql
        .mockResolvedValueOnce({ data: { getMedia: withThumb } })
        .mockResolvedValueOnce({ data: { deleteMedia: { id: 'media-123' } } });

      await deleteMedia('media-123');

      expect(mockRemove).toHaveBeenCalledWith({ path: 'public/thumbnails/media-123.jpg' });
    });

    it('should still delete DDB record if an S3 deletion fails', async () => {
      mockRemove.mockRejectedValue(new Error('S3 error') as any);
      mockGraphql
        .mockResolvedValueOnce({ data: { getMedia: mockMediaFull } })
        .mockResolvedValueOnce({ data: { deleteMedia: { id: 'media-123' } } });

      await deleteMedia('media-123');

      expect(mockGraphql).toHaveBeenCalledTimes(2);
    });
  });

  describe('subscribeToMediaChanges', () => {
    let mockUnsubscribe: jest.Mock;
    let mockSubscribe: jest.Mock;

    beforeEach(() => {
      mockUnsubscribe = jest.fn();
      mockSubscribe = jest.fn().mockReturnValue({ unsubscribe: mockUnsubscribe });
      mockGraphql.mockReturnValue({ subscribe: mockSubscribe });
    });

    it('should subscribe with no filter when no id given (owner auth restricts automatically)', () => {
      const callback = jest.fn();
      subscribeToMediaChanges({}, callback);

      expect(mockGraphql).toHaveBeenCalledWith({
        query: 'mock-on-update-media-subscription',
        variables: {},
      });
      expect(mockSubscribe).toHaveBeenCalledWith(
        expect.objectContaining({ next: expect.any(Function), error: expect.any(Function) })
      );
    });

    it('should subscribe with id filter when given an id', () => {
      const callback = jest.fn();
      subscribeToMediaChanges({ id: 'media-xyz' }, callback);

      expect(mockGraphql).toHaveBeenCalledWith({
        query: 'mock-on-update-media-subscription',
        variables: { filter: { id: { eq: 'media-xyz' } } },
      });
    });

    it('should invoke callback when media update arrives', () => {
      const callback = jest.fn();
      subscribeToMediaChanges({}, callback);

      const nextFn = mockSubscribe.mock.calls[0][0].next;
      const updatedMedia = { id: 'media-1', status: 'READY', _deleted: false };
      nextFn({ data: { onUpdateMedia: updatedMedia } });

      expect(callback).toHaveBeenCalledWith(updatedMedia);
    });

    it('should not invoke callback when media is deleted', () => {
      const callback = jest.fn();
      subscribeToMediaChanges({}, callback);

      const nextFn = mockSubscribe.mock.calls[0][0].next;
      nextFn({ data: { onUpdateMedia: { id: 'media-1', status: 'READY', _deleted: true } } });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should return unsubscribe function that calls unsubscribe on subscription', () => {
      const callback = jest.fn();
      const unsubscribe = subscribeToMediaChanges({}, callback);

      unsubscribe();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});
