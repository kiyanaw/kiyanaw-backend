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

    // Prepare update data with analysis if updating main text
    const updateData: {
      regionText?: string;
      translation?: string;
      regionAnalysis?: string[];
    } = field === 'regionText' 
      ? { regionText: text }
      : { translation: text };

    // If updating main text, include current analysis from store
    if (field === 'regionText') {
      try {
        const region = storeState.regionById(regionId);
        if (region?.regionAnalysis) {
          updateData.regionAnalysis = region.regionAnalysis;
        }
      } catch (error) {
        console.warn('Could not get analysis from store:', error);
        // Continue without analysis
      }
    }

    console.log('updating region', regionId, updateData)

    try {
      services.regionService.updateRegion(
        regionId,
        updateData,
        user.username,
        3000 // debounceMs
      );
    } catch (error) {
      console.error('Failed to update region text:', error);
    }
  }
} 