import { services } from '../services';
import { UpdateRegionUseCase } from './update-region';

// NOTE: Conflict handling functions moved to versionConflictService.ts for reuse

interface UpdateRegionTextConfig {
  regionId: string;
  text: string;
  field: 'regionText' | 'translation';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any; // ZustandStore with text editing capabilities
  services: typeof services;
}

// NOTE: Debounced save state moved to unified UpdateRegionUseCase

/**
 * @deprecated Use regionSaveManager.queueTextChange() or queueTranslationChange() instead.
 * This use-case is now only called internally by RegionSaveManager.
 * Direct usage from components/hooks should be migrated to the manager.
 */
export class UpdateRegionTextUseCase {
  private config: UpdateRegionTextConfig;

  constructor(config: UpdateRegionTextConfig) {
    this.config = config;
  }

  validate(): void {
    if (!this.config.regionId) {
      throw new Error('regionId is required');
    }
  }

  execute(): void {
    this.validate();

    const { regionId, text, field, store, services } = this.config;

    // Delegate to unified UpdateRegionUseCase
    const updateRegionUseCase = new UpdateRegionUseCase({
      regionId,
      changes: { [field]: text },
      debounceMs: 3000, // 3 second debounce for text
      primaryField: field,
      pendingEditField: field, // Track pending edits for text/translation
      services,
      store
    });

    updateRegionUseCase.execute();
  }
} 