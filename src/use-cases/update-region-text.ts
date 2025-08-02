import { services } from '../services';
import { showToast } from '../services/toastService';
import { UpdateTranscriptionUseCase } from './update-transcription';
import Timeout from 'smart-timeout';

interface UpdateRegionTextConfig {
  regionId: string;
  text: string;
  field: 'regionText' | 'translation';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any; // ZustandStore with text editing capabilities
  services: typeof services;
}

// Debounced save state at module level
const pendingSaves = new Map<string, string>();

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
      store.setRegionText(regionId, text);
    } else {
      store.setRegionTranslation(regionId, text);
    }

    // Check if user is authenticated
    const user = services.authService.currentUser();
    if (!user) {
      console.warn('User not authenticated, skipping region text update');
      return;
    }

    // Clear any existing timeout for this region
    const existingTimeout = pendingSaves.get(regionId);
    if (existingTimeout) {
      Timeout.clear(existingTimeout);
    }

    // Set up debounced save that grabs fresh analysis at save time
    const timeoutKey = `region-text-save-${regionId}`;
    Timeout.set(timeoutKey, async () => {
      try {
        // Get fresh state at save time
        
        // Prepare update data
        const updateData: {
          regionText?: string;
          translation?: string;
          regionAnalysis?: string[];
        } = field === 'regionText' 
          ? { regionText: text }
          : { translation: text };

        // If updating main text, include current analysis from store at save time
        if (field === 'regionText') {
          try {
            const region = store.regionById(regionId);
            if (region?.regionAnalysis) {
              updateData.regionAnalysis = region.regionAnalysis;
            }
          } catch (error) {
            console.warn('Could not get analysis from store at save time:', error);
            // Continue without analysis
          }
        }

        // Save to database
        await services.regionService.updateRegion(
          regionId,
          updateData,
          user.username
        );

        // Remove from pending saves
        pendingSaves.delete(regionId);

        // Update the transcription with metadata
        const region = store.regionById(regionId);
        const updateTranscriptionUseCase = new UpdateTranscriptionUseCase({
          transcriptionId: region.transcriptionId,
          services,
          state: store,
        });
        
        await updateTranscriptionUseCase.execute();
        
      } catch (error) {
        console.error('Failed to save region text:', error);
        pendingSaves.delete(regionId);
      }
    }, 3000); // 3 second debounce

    // Store the pending save
    pendingSaves.set(regionId, timeoutKey);
  }
} 