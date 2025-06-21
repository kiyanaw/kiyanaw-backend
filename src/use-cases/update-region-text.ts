import { services } from '../services';

interface UpdateRegionTextConfig {
  regionId: string;
  text: string;
  field: 'regionText' | 'translation';
  store: any; // whole store object
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

    // Save to DataStore with longer debouncing to allow analysis to complete first
    // Analysis takes 1.5s + API time (~1.7s total), so we use 3s to ensure it completes before save
    const currentUser = services.authService.currentUser();
    if (currentUser) {
      const updates = { [field]: text };
      
      // Use regular save method with store - service will handle analysis coordination internally
      services.regionService.updateRegion(regionId, updates, currentUser.username, 3000, store);
    }
  }
} 