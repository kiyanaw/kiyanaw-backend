import { uploadService } from './uploadService';
import { awsConfigService } from './awsConfigService';
import { uploadData } from 'aws-amplify/storage';

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
}); 