import { useEditorStore } from '../stores/useEditorStore';
import { services } from '../services';

interface UpdateRegionTextConfig {
  regionId: string;
  text: string;
  field: 'regionText' | 'translation';
  store: typeof useEditorStore;
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
    if (field === 'regionText') {
      store.getState().setRegionText(regionId, text);
    } else {
      store.getState().setRegionTranslation(regionId, text);
    }

    // Save to DataStore with debouncing (simple!)
    const currentUser = services.authService.currentUser();
    if (currentUser) {
      const updates = { [field]: text };
      services.regionService.updateRegion(regionId, updates, currentUser.username);
    }
  }
} 