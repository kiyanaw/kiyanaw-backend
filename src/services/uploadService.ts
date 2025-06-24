import { uploadData } from 'aws-amplify/storage';
import { awsConfigService } from './awsConfigService';

export interface UploadProgress {
  transferredBytes: number;
  totalBytes: number;
  percentage: number;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
}

/**
 * Upload Service
 * 
 * Handles file uploads to S3 using Amplify Storage API
 */
class UploadService {
  /**
   * Upload a file to S3 with optional progress tracking
   */
  async uploadFile(file: File, options?: UploadOptions): Promise<string> {
    const timestamp = Date.now();
    const key = `${timestamp}-${file.name}`;

    await uploadData({
      key,
      data: file,
      options: {
        // TODO: move this to restricted access
        accessLevel: 'guest', // equivalent to 'public' in v5
        onProgress: ({ transferredBytes, totalBytes }) => {
          if (totalBytes && options?.onProgress) {
            const percentage = (transferredBytes / totalBytes) * 100;
            options.onProgress({
              transferredBytes,
              totalBytes,
              percentage
            });
          }
        },
      },
    }).result;

    return key;
  }

  /**
   * Construct the public S3 URL for a given key
   * TODO: move this to use signed URLs for security
   */
  constructPublicUrl(key: string): string {
    const bucket = awsConfigService.getUserFilesBucket();
    
    // Use the virtual-hosted-style S3 URL format
    return `https://${bucket}.s3.amazonaws.com/public/${key}`;
  }
}

// Export singleton instance
export const uploadService = new UploadService();
export type { UploadService }; 