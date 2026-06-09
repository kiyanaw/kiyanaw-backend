import { services } from '../services';
import type { UploadProgress } from '../services/uploadService';
import type { TranscriptionData } from '../types/shared';

export interface CreateTranscriptionConfig {
  title: string;
  file: File;
  username: string;
  userId: string;
  services: typeof services;
  onProgress?: (progress: UploadProgress) => void;
}

export interface CreateTranscriptionResult {
  transcriptionId: string;
  transcription: TranscriptionData;
  mediaId: string;
}

export class CreateTranscriptionUseCase {
  private config: CreateTranscriptionConfig;

  constructor(config: CreateTranscriptionConfig) {
    this.config = config;
  }

  validate() {
    if (!this.config.title?.trim()) {
      throw new Error('Title is required');
    }
    if (!this.config.file) {
      throw new Error('File is required');
    }
    if (!this.config.username) {
      throw new Error('Username is required');
    }
    if (!this.config.userId) {
      throw new Error('User ID is required');
    }
  }

  async execute(): Promise<CreateTranscriptionResult> {
    this.validate();

    const { title, file, username, userId, services, onProgress } = this.config;
    const displayUsername = username.split('@')[0];

    const mediaId = crypto.randomUUID();
    const key = services.uploadService.buildOriginalKey(userId, mediaId, file.name);
    const originalKey = await services.uploadService.uploadOriginal(file, key, { onProgress });

    await services.mediaService.createMedia({
      id: mediaId,
      owner: userId,
      originalKey,
      mimeType: file.type,
      fileSize: file.size,
    });

    const transcription = await services.transcriptionService.create({
      title,
      type: file.type,
      author: userId,
      userLastUpdated: displayUsername,
      isPrivate: true,
      mediaId,
    });

    return {
      transcriptionId: transcription.id,
      transcription,
      mediaId,
    };
  }
} 