import { services } from '../services';

interface RefreshMediaCredentialsConfig {
  source: string;
  peaks: unknown;
  services: typeof services;
}

/**
 * Refreshes media credentials in-place without page reload.
 *
 * This use-case:
 * 1. Forces fresh AWS credentials
 * 2. Reloads media with a new signed URL
 * 3. Preserves playback position
 *
 * Used when signed URLs expire to provide a seamless refresh experience.
 */
export class RefreshMediaCredentials {
  private readonly source: string;
  private readonly peaks: unknown;
  private readonly transcriptionService: typeof services.transcriptionService;
  private readonly wavesurferService: typeof services.wavesurferService;

  constructor(config: RefreshMediaCredentialsConfig) {
    this.source = config.source;
    this.peaks = config.peaks;
    this.transcriptionService = config.services.transcriptionService;
    this.wavesurferService = config.services.wavesurferService;
  }

  validate(): void {
    if (!this.source) {
      throw new Error('Media source is required');
    }
  }

  async execute(): Promise<void> {
    this.validate();

    // Force fresh AWS credentials
    await this.transcriptionService.forceFreshCredentials();

    // Reload media with fresh signed URL (preserves playback position)
    await this.wavesurferService.reloadWithFreshUrl(this.source, this.peaks);
  }
}
