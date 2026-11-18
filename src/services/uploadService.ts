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
        onProgress: this._progressHandler(options),
      },
    }).result;
  }

  private _progressHandler(options?: UploadOptions) {
    return ({ transferredBytes, totalBytes }: { transferredBytes: number; totalBytes?: number }) => {
      if (totalBytes && options?.onProgress) {
        const percentage = (transferredBytes / totalBytes) * 100;
        options.onProgress({ transferredBytes, totalBytes, percentage });
      }
    };
  }

  async uploadFile(file: File, options?: UploadOptions): Promise<string> {
    const key = `${Date.now()}-${file.name}`;
    await this._upload(key, file, options);
    return key;
  }

  /**
   * Full S3 key of an original upload: public/originals/<identityId>/<mediaId>.<ext>.
   * The identity folder is what the storage IAM policy scopes Put/Get to.
   */
  buildOriginalPath(identityId: string | undefined, mediaId: string, fileName: string): string {
    if (!identityId) {
      throw new Error('Cannot upload original: no Cognito identity id');
    }
    const ext = fileName.includes('.')
      ? fileName.split('.').pop()!.toLowerCase()
      : 'mp3';
    return `public/originals/${identityId}/${mediaId}.${ext}`;
  }

  /**
   * Uploads an original into the caller's identity folder.
   * @returns the full S3 key (store as Media.originalKey)
   */
  async uploadOriginal(file: File, mediaId: string, options?: UploadOptions): Promise<string> {
    const { path } = await uploadData({
      path: ({ identityId }) => this.buildOriginalPath(identityId, mediaId, file.name),
      data: file,
      options: { onProgress: this._progressHandler(options) },
    }).result;
    return path;
  }

  constructPublicUrl(key: string): string {
    const bucket = awsConfigService.getUserFilesBucket();
    return `https://${bucket}.s3.amazonaws.com/public/${key}`;
  }
}

// Export singleton instance
export const uploadService = new UploadService();
export type { UploadService }; 