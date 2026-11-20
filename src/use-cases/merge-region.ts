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

    const user = services.authService.currentUser();
    if (!user) throw new Error('User must be authenticated');

    // Drop unsent changes for both regions and wait for any save of them already on
    // the network; the merged values below are read from the store after that.
    await Promise.all([
      regionSaveManager.cancelPendingSaves(survivorId),
      regionSaveManager.cancelPendingSaves(absorbedId),
    ]);

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

    // Optimistic store update for survivor
    store.setRegionText(survivorId, mergedText);
    store.setRegionTranslation(survivorId, mergedTranslation);
    store.updateRegionBounds(survivorId, newStart, newEnd);

    // Push merged text into the live RTE editors (useTextEditors only seeds content
    // when empty, so we must explicitly refresh the survivor's editors here)
    if (services.rteService.getInstance(`${survivorId}:main`)) {
      services.rteService.setContent(`${survivorId}:main`, mergedText);
    }
    if (services.rteService.getInstance(`${survivorId}:translation`)) {
      services.rteService.setContent(`${survivorId}:translation`, mergedTranslation);
    }

    // Save the survivor through the per-region save queue (serialised with any other
    // save of it) and wait for it to land before deleting the absorbed region
    regionSaveManager.queueTextChange(survivorId, mergedText);
    regionSaveManager.queueTranslationChange(survivorId, mergedTranslation);
    regionSaveManager.queueBoundsChange(survivorId, newStart, newEnd);
    await regionSaveManager.flushNow(survivorId);

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
