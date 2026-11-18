import { uploadService } from './uploadService';
import { awsConfigService } from './awsConfigService';
import { uploadData } from 'aws-amplify/storage';
import type { UploadDataWithPathInput, UploadDataWithPathOutput } from 'aws-amplify/storage';

// Mock AWS Amplify uploadData
jest.mock('aws-amplify/storage', () => ({
  uploadData: jest.fn()
}));

// Mock awsConfigService
jest.mock('./awsConfigService', () => ({
  awsConfigService: {
    getUserFilesBucket: jest.fn().mockReturnValue('test-bucket'),
    getUserFilesBucketRegion: jest.fn().mockReturnValue('us-east-1')
  }
}));

const mockUploadData = uploadData as jest.MockedFunction<typeof uploadData>;
const mockAwsConfigService = awsConfigService as jest.Mocked<typeof awsConfigService>;

describe('UploadService', () => {
  const mockFile = new File(['test content'], 'test.mp3', { type: 'audio/mpeg' });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the current timestamp to make key generation predictable
    jest.spyOn(Date, 'now').mockReturnValue(1234567890);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload file with generated key', async () => {
      const mockResult = Promise.resolve({ key: 'test-key' });
      mockUploadData.mockReturnValue({
        result: mockResult,
        cancel: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        state: 'IN_PROGRESS'
      } as any);

      const key = await uploadService.uploadFile(mockFile);

      expect(uploadData).toHaveBeenCalledWith({
        key: '1234567890-test.mp3',
        data: mockFile,
        options: {
          accessLevel: 'guest',
          onProgress: expect.any(Function),
        },
      });
      expect(key).toBe('1234567890-test.mp3');
    });

    it('should call progress callback when provided', async () => {
      const progressCallback = jest.fn();
      const mockResult = Promise.resolve({ key: 'test-key' });
      
      // Set up uploadData to call the progress callback
      mockUploadData.mockImplementation(({ options }) => {
        // Simulate progress callback
        if (options?.onProgress) {
          options.onProgress({ transferredBytes: 50, totalBytes: 100 });
        }
        return {
          result: mockResult,
          cancel: jest.fn(),
          pause: jest.fn(),
          resume: jest.fn(),
          state: 'IN_PROGRESS'
        } as any;
      });

      await uploadService.uploadFile(mockFile, {
        onProgress: progressCallback
      });

      expect(progressCallback).toHaveBeenCalledWith({
        transferredBytes: 50,
        totalBytes: 100,
        percentage: 50
      });
    });

    it('should not call progress callback if totalBytes is zero', async () => {
      const progressCallback = jest.fn();
      const mockResult = Promise.resolve({ key: 'test-key' });
      
      mockUploadData.mockImplementation(({ options }) => {
        if (options?.onProgress) {
          options.onProgress({ transferredBytes: 50, totalBytes: 0 });
        }
        return {
          result: mockResult,
          cancel: jest.fn(),
          pause: jest.fn(),
          resume: jest.fn(),
          state: 'IN_PROGRESS'
        } as any;
      });

      await uploadService.uploadFile(mockFile, {
        onProgress: progressCallback
      });

      expect(progressCallback).not.toHaveBeenCalled();
    });

    it('should handle upload without progress callback', async () => {
      const mockResult = Promise.resolve({ key: 'test-key' });
      mockUploadData.mockReturnValue({
        result: mockResult,
        cancel: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        state: 'IN_PROGRESS'
      } as any);

      const key = await uploadService.uploadFile(mockFile);

      expect(key).toBe('1234567890-test.mp3');
      expect(uploadData).toHaveBeenCalled();
    });

    it('should propagate upload errors', async () => {
      const uploadError = new Error('Upload failed');
      mockUploadData.mockReturnValue({
        result: Promise.reject(uploadError),
        cancel: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        state: 'ERROR'
      } as any);

      await expect(uploadService.uploadFile(mockFile)).rejects.toThrow('Upload failed');
    });
  });

  describe('constructPublicUrl', () => {
    it('should construct correct S3 URL using AWS config', () => {
      const url = uploadService.constructPublicUrl('test-key.mp3');

      expect(mockAwsConfigService.getUserFilesBucket).toHaveBeenCalled();
      expect(url).toBe('https://test-bucket.s3.amazonaws.com/public/test-key.mp3');
    });

    it('should handle different file keys', () => {
      const url = uploadService.constructPublicUrl('1234567890-video.mp4');

      expect(url).toBe('https://test-bucket.s3.amazonaws.com/public/1234567890-video.mp4');
    });

    it('should work with different bucket and region configurations', () => {
      mockAwsConfigService.getUserFilesBucket.mockReturnValue('different-bucket-name');
      mockAwsConfigService.getUserFilesBucketRegion.mockReturnValue('us-west-2');

      const url = uploadService.constructPublicUrl('file.wav');

      expect(url).toBe('https://different-bucket-name.s3.amazonaws.com/public/file.wav');
    });
  });

  describe('Service Architecture Compliance', () => {
    it('should be stateless - multiple calls should not interfere', async () => {
      const mockResult = Promise.resolve({ key: 'test-key' });
      mockUploadData.mockReturnValue({
        result: mockResult,
        cancel: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        state: 'IN_PROGRESS'
      } as any);

      const file1 = new File(['content1'], 'file1.mp3', { type: 'audio/mpeg' });
      const file2 = new File(['content2'], 'file2.mp3', { type: 'audio/mpeg' });

      const [key1, key2] = await Promise.all([
        uploadService.uploadFile(file1),
        uploadService.uploadFile(file2)
      ]);

      expect(key1).toBe('1234567890-file1.mp3');
      expect(key2).toBe('1234567890-file2.mp3');
      expect(uploadData).toHaveBeenCalledTimes(2);
    });

    it('should not mutate input objects', async () => {
      const mockResult = Promise.resolve({ key: 'test-key' });
      mockUploadData.mockReturnValue({
        result: mockResult,
        cancel: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        state: 'IN_PROGRESS'
      } as any);

      const originalFile = new File(['test'], 'original.mp3', { type: 'audio/mpeg' });
      const originalName = originalFile.name;

      await uploadService.uploadFile(originalFile);

      expect(originalFile.name).toBe(originalName);
    });
  });

  describe('buildOriginalPath', () => {
    const ID = 'us-east-1:11111111-2222-3333-4444-555555555555';

    it('should build the identity-scoped key with the lowercased extension', () => {
      expect(uploadService.buildOriginalPath(ID, 'media-456', 'recording.MP3'))
        .toBe(`public/originals/${ID}/media-456.mp3`);
      expect(uploadService.buildOriginalPath(ID, 'media-456', 'video.mp4'))
        .toBe(`public/originals/${ID}/media-456.mp4`);
    });

    it('should fall back to mp3 when no extension present', () => {
      expect(uploadService.buildOriginalPath(ID, 'm', 'noextension')).toBe(`public/originals/${ID}/m.mp3`);
    });

    it('should fail fast without an identity id', () => {
      expect(() => uploadService.buildOriginalPath(undefined, 'm', 'a.mp3')).toThrow('no Cognito identity id');
      expect(() => uploadService.buildOriginalPath('', 'm', 'a.mp3')).toThrow('no Cognito identity id');
    });
  });

  describe('uploadOriginal', () => {
    const ID = 'us-east-1:11111111-2222-3333-4444-555555555555';

    /** Fakes uploadData: resolves the path callback the way Amplify does, with the given identity. */
    const fakeUpload = (identityId: string | undefined, progress?: { transferredBytes: number; totalBytes: number }) => {
      const impl = (input: UploadDataWithPathInput): Partial<UploadDataWithPathOutput> => {
        const result = (async () => {
          const path = typeof input.path === 'string' ? input.path : input.path({ identityId });
          if (progress) input.options?.onProgress?.(progress);
          return { path };
        })();
        return { result: result as UploadDataWithPathOutput['result'] };
      };
      mockUploadData.mockImplementation(impl as typeof uploadData);
    };

    it('should upload into the identity folder and return the full key', async () => {
      fakeUpload(ID);
      const file = new File(['content'], 'audio.WAV', { type: 'audio/wav' });

      const result = await uploadService.uploadOriginal(file, 'media-1');

      expect(result).toBe(`public/originals/${ID}/media-1.wav`);
      const input = mockUploadData.mock.calls[0][0];
      expect(input.data).toBe(file);
      expect('key' in input).toBe(false);
    });

    it('should fail fast when there is no identity id', async () => {
      fakeUpload(undefined);
      await expect(uploadService.uploadOriginal(new File(['x'], 'x.mp3'), 'm')).rejects.toThrow('no Cognito identity id');
    });

    it('should forward progress events', async () => {
      fakeUpload(ID, { transferredBytes: 30, totalBytes: 100 });
      const progressCallback = jest.fn();

      await uploadService.uploadOriginal(new File(['x'], 'x.mp3'), 'm', { onProgress: progressCallback });

      expect(progressCallback).toHaveBeenCalledWith({ transferredBytes: 30, totalBytes: 100, percentage: 30 });
    });

    it('should propagate upload errors', async () => {
      mockUploadData.mockImplementation(() => {
        const task: Partial<ReturnType<typeof uploadData>> = { result: Promise.reject(new Error('Upload failed')) };
        return task as ReturnType<typeof uploadData>;
      });
      await expect(uploadService.uploadOriginal(new File(['x'], 'x.mp3'), 'm')).rejects.toThrow('Upload failed');
    });
  });
}); 