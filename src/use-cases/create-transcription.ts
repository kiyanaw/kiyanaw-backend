import { services } from '../services';
import type { UploadProgress } from '../services/uploadService';
import { Transcription } from '../models';

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
  transcription: Transcription;
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

    // Step 1: Upload file to S3
    const fileKey = await services.uploadService.uploadFile(file, {
      onProgress,
    });

    // Step 2: Construct the source URL
    const source = services.uploadService.constructPublicUrl(fileKey);

    // Step 3: Create the transcription record
    const transcription = await services.transcriptionService.create({
      title,
      source,
      type: file.type,
      author: username,
      userLastUpdated: username,
    });

    // Step 4: Find or create contributor
    const contributor = await services.contributorService.findOrCreate(
      username,
      userId // Using userId as email placeholder
    );

    // Step 5: Link contributor to transcription
    await services.contributorService.linkToTranscription(contributor, transcription);

    return {
      transcriptionId: transcription.id,
      transcription,
    };
  }
} 