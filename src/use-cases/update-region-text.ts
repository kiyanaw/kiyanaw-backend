import { services } from '../services';

interface UpdateRegionTextConfig {
  regionId: string;
  text: string;
  field: 'regionText' | 'translation';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any; // ZustandStore with text editing capabilities
  services: typeof services;
}

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

    // Update local store immediately for responsive UI
    const storeState = store.getState();
    if (field === 'regionText') {
      storeState.setRegionText(regionId, text);
    } else {
      storeState.setRegionTranslation(regionId, text);
    }

    // Check if user is authenticated
    const user = services.authService.currentUser();
    if (!user) {
      console.warn('User not authenticated, skipping region text update');
      return;
    }

    // Debounced save to backend
    const updateData = field === 'regionText' 
      ? { regionText: text }
      : { translation: text };

    try {
      services.regionService.updateRegion(
        regionId,
        updateData,
        user.username,
        3000, // 3 second debounce
        store
      );
    } catch (error) {
      console.error('Failed to save region text:', error);
      // Note: We don't revert the optimistic update here as it's handled by the regionService
    }
  }
} 