import { services } from '../services';
import { regionSaveManager } from '../services/regionSaveManager';
import { UpdateIssueUseCase } from './update-issue';
import { DeleteRegion } from './delete-region';
import type { User } from '../types/shared';

interface MergeRegionConfig {
  survivorId: string;
  absorbedId: string;
  transcriptionId: string;
  user: User;
  services: typeof services;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any;
}

export class MergeRegionUseCase {
  private config: MergeRegionConfig;

  constructor(config: MergeRegionConfig) {
    this.config = config;
  }

  validate(): void {
    const { survivorId, absorbedId, store } = this.config;
    if (!survivorId) throw new Error('survivorId is required');
    if (!absorbedId) throw new Error('absorbedId is required');
    if (survivorId === absorbedId) throw new Error('survivorId and absorbedId must differ');
    if (!store.regionById(survivorId)) throw new Error('Survivor region not found');
    if (!store.regionById(absorbedId)) throw new Error('Absorbed region not found');
  }

  async execute(): Promise<void> {
    this.validate();

    const { survivorId, absorbedId, transcriptionId, services, store } = this.config;

    const survivor = store.regionById(survivorId);
    const absorbed = store.regionById(absorbedId);

    const newStart = Math.min(survivor.start, absorbed.start);
    const newEnd = Math.max(survivor.end, absorbed.end);
    const mergedText = [survivor.regionText, absorbed.regionText]
      .map((s: string | null | undefined) => (s || '').trim())
      .filter(Boolean)
      .join(' ');
    const mergedTranslation = [survivor.translation, absorbed.translation]
      .map((s: string | null | undefined) => (s || '').trim())
      .filter(Boolean)
      .join(' ');

    regionSaveManager.cancelPendingSaves(survivorId);
    regionSaveManager.cancelPendingSaves(absorbedId);

    // Optimistic store update for survivor
    store.setRegionText(survivorId, mergedText);
    store.setRegionTranslation(survivorId, mergedTranslation);
    store.updateRegionBounds(survivorId, newStart, newEnd);

    // Backend save for survivor (await to bump version before delete)
    const user = services.authService.currentUser();
    if (!user) throw new Error('User must be authenticated');
    const version = store.getRegionVersion(survivorId);
    await services.regionService.updateRegion(
      survivorId,
      { regionText: mergedText, translation: mergedTranslation, start: newStart, end: newEnd },
      user.username,
      version,
    );
    store.setRegionVersion(survivorId, version + 1);

    // Move wavesurfer region to span merged bounds
    services.wavesurferService.setRegionPosition(survivorId, { start: newStart, end: newEnd });

    // Reassign all issues from absorbed region to survivor
    const issues = store.getIssuesForRegion(absorbedId);
    for (const issue of issues) {
      await new UpdateIssueUseCase({ issueId: issue.id, updates: { regionId: survivorId } }).execute();
    }

    // Delete the absorbed region
    await new DeleteRegion({ regionId: absorbedId, transcriptionId, user, services, store }).execute();

    // Keep focus on the surviving region
    store.setSelectedRegion(survivorId);
  }
}
