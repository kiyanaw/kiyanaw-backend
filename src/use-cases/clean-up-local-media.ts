import type { LocalServices } from '../services/localServices';

export interface CleanUpLocalMediaInput {
  services: {
    localMediaService: Pick<LocalServices['localMediaService'], 'listMediaIds' | 'idsBeingCreated' | 'deleteMedia' | 'withCleanupLock'>;
    localTranscriptionService: Pick<LocalServices['localTranscriptionService'], 'listProjectIds'>;
  };
}

/**
 * Removes media left behind by a project whose creation never finished (e.g. the page reloaded
 * mid-open). Media that belongs to a project, or is still being created in some tab, is kept.
 */
export class CleanUpLocalMediaUseCase {
  private readonly services: CleanUpLocalMediaInput['services'];

  constructor(input: CleanUpLocalMediaInput) {
    this.services = input.services;
  }

  execute(): Promise<string[]> {
    return this.services.localMediaService.withCleanupLock(() => this.removeOrphans());
  }

  private async removeOrphans(): Promise<string[]> {
    const { localMediaService, localTranscriptionService } = this.services;
    const [mediaIds, projectIds, creating] = await Promise.all([
      localMediaService.listMediaIds(),
      localTranscriptionService.listProjectIds(),
      localMediaService.idsBeingCreated(),
    ]);
    const keep = new Set([...projectIds, ...creating]);
    const orphans = mediaIds.filter((id) => !keep.has(id));
    await Promise.all(orphans.map((id) => localMediaService.deleteMedia(id)));
    return orphans;
  }
}
