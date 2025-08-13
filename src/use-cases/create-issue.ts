import { createIssueForRegion } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import { rteService } from '../services/rteService';
import type { IssueData } from '../services/adt';

export interface CreateIssueConfig {
  text: string;
  type: string;
  owner: string;
  ownerFriendly: string;
  regionId?: string;
  transcriptionId: string;
}

export class CreateIssueUseCase {
  constructor(private config: CreateIssueConfig) {}

  validate(): void {
    if (!this.config.text?.trim()) {
      throw new Error('Issue text is required');
    }
    if (!this.config.type) {
      throw new Error('Issue type is required');
    }
    if (!this.config.owner) {
      throw new Error('Issue owner is required');
    }
    if (!this.config.ownerFriendly) {
      throw new Error('Issue owner friendly name is required');
    }
    if (!this.config.transcriptionId) {
      throw new Error('Transcription ID is required');
    }
  }

  async execute(): Promise<IssueData> {
    this.validate();

    // Create optimistic issue object for immediate UI update
    const optimisticIssue: IssueData = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Temporary ID
      text: this.config.text.trim(),
      type: this.config.type,
      owner: this.config.owner,
      ownerFriendly: this.config.ownerFriendly,
      regionId: this.config.regionId || '',
      transcriptionId: this.config.transcriptionId,
      resolved: false,
      index: 0, // Will be updated from backend
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      commentCount: 0,
      _version: 1, // Temporary version
    };

    // Update UI immediately with optimistic issue
    const store = useEditorStore.getState();
    store.addNewIssue(optimisticIssue);
    rteService.updateIssueHighlighting(optimisticIssue.regionId);

    try {
      // Save to backend
      const savedIssue = await createIssueForRegion({
        text: this.config.text.trim(),
        type: this.config.type,
        owner: this.config.owner,
        ownerFriendly: this.config.ownerFriendly,
        regionId: this.config.regionId || '',
        transcriptionId: this.config.transcriptionId,
      });

      // Replace optimistic issue with real one from backend
      store.deleteIssue(optimisticIssue.id);
      store.addNewIssue(savedIssue);
      rteService.updateIssueHighlighting(savedIssue.regionId);

      return savedIssue;
    } catch (error) {
      console.error('Failed to create issue:', error);
      // Remove optimistic issue on failure
      store.deleteIssue(optimisticIssue.id);
      rteService.updateIssueHighlighting(optimisticIssue.regionId);
      throw error;
    }
  }
}