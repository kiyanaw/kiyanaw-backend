import { useEditorStore } from '../stores/useEditorStore';

interface UpdateRegionTextConfig {
  regionId: string;
  text: string;
  field: 'regionText' | 'translation';
  store: typeof useEditorStore;
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
    
    const { regionId, text, field, store } = this.config;
    if (field === 'regionText') {
      store.getState().setRegionText(regionId, text);
    } else {
      store.getState().setRegionTranslation(regionId, text);
    }
  }
} 