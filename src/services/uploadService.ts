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
  private async _upload(key: string, file: File, options?: UploadOptions): Promise<void> {
    await uploadData({
      key,
      data: file,
      options: {
        accessLevel: 'guest',
        onProgress: ({ transferredBytes, totalBytes }) => {
          if (totalBytes && options?.onProgress) {
            const percentage = (transferredBytes / totalBytes) * 100;
            options.onProgress({ transferredBytes, totalBytes, percentage });
          }
        },
      },
    }).result;
  }

  async uploadFile(file: File, options?: UploadOptions): Promise<string> {
    const key = `${Date.now()}-${file.name}`;
    await this._upload(key, file, options);
    return key;
  }

  buildOriginalKey(userId: string, mediaId: string, fileName: string): string {
    const ext = fileName.includes('.')
      ? fileName.split('.').pop()!.toLowerCase()
      : 'mp3';
    return `originals/${userId}/${mediaId}.${ext}`;
  }

  async uploadOriginal(file: File, key: string, options?: UploadOptions): Promise<string> {
    await this._upload(key, file, options);
    return `public/${key}`;
  }

  constructPublicUrl(key: string): string {
    const bucket = awsConfigService.getUserFilesBucket();
    return `https://${bucket}.s3.amazonaws.com/public/${key}`;
  }
}

// Export singleton instance
export const uploadService = new UploadService();
export type { UploadService }; 