import { services } from '../services';
import { regionSaveManager } from '../services/regionSaveManager';
import { UpdateIssueUseCase } from './update-issue';
import { DeleteRegion } from './delete-region';
import type { User } from '../types/shared';
import type { RegionData } from '../services/adt';

type RegionSnapshot = Pick<RegionData, 'regionText' | 'translation' | 'start' | 'end' | 'regionAnalysis'>;

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
    const before = {
      survivor: this.snapshot(survivor),
      absorbed: this.snapshot(absorbed),
    };

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
    // save of it) and wait for it to land before deleting the absorbed region.
    // All-or-nothing: if it fails, undo the merge locally and delete nothing.
    regionSaveManager.queueTextChange(survivorId, mergedText);
    regionSaveManager.queueTranslationChange(survivorId, mergedTranslation);
    regionSaveManager.queueBoundsChange(survivorId, newStart, newEnd);
    try {
      await regionSaveManager.saveNowOrThrow(survivorId);
    } catch (error) {
      this.restore(survivorId, before.survivor);
      this.restore(absorbedId, before.absorbed);
      throw error;
    }

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

  private snapshot(region: RegionSnapshot): RegionSnapshot {
    return {
      regionText: region.regionText,
      translation: region.translation,
      start: region.start,
      end: region.end,
      regionAnalysis: region.regionAnalysis,
    };
  }

  /** Put a region back to its pre-merge values in the store and its open editors */
  private restore(regionId: string, values: RegionSnapshot): void {
    const { services, store } = this.config;
    // A region without text/analysis yet is stored and shown as empty
    const regionText = values.regionText ?? '';
    const translation = values.translation ?? '';
    store.setRegionText(regionId, regionText);
    store.setRegionTranslation(regionId, translation);
    store.updateRegionBounds(regionId, values.start, values.end);
    store.setRegionAnalysis(regionId, values.regionAnalysis ?? []);
    if (services.rteService.getInstance(`${regionId}:main`)) {
      services.rteService.setContent(`${regionId}:main`, regionText);
    }
    if (services.rteService.getInstance(`${regionId}:translation`)) {
      services.rteService.setContent(`${regionId}:translation`, translation);
    }
  }
}
