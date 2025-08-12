import { createIssueForRegion } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import { rteService } from '../services/rteService';
import type { IssueData } from '../services/adt';

export interface CreateIssueInput {
  text: string;
  type: string;
  owner: string;
  ownerFriendly: string;
  regionId?: string;
  transcriptionId: string;
}

export class CreateIssueUseCase {
  constructor() {}

  validate(input: CreateIssueInput): void {
    if (!input.text?.trim()) {
      throw new Error('Issue text is required');
    }
    if (!input.type) {
      throw new Error('Issue type is required');
    }
    if (!input.owner) {
      throw new Error('Issue owner is required');
    }
    if (!input.ownerFriendly) {
      throw new Error('Issue owner friendly name is required');
    }
    if (!input.transcriptionId) {
      throw new Error('Transcription ID is required');
    }
  }

  async execute(input: CreateIssueInput): Promise<IssueData> {
    this.validate(input);

    // Create optimistic issue object for immediate UI update
    const optimisticIssue: IssueData = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Temporary ID
      text: input.text.trim(),
      type: input.type,
      owner: input.owner,
      ownerFriendly: input.ownerFriendly,
      regionId: input.regionId || '',
      transcriptionId: input.transcriptionId,
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
        text: input.text.trim(),
        type: input.type,
        owner: input.owner,
        ownerFriendly: input.ownerFriendly,
        regionId: input.regionId || '',
        transcriptionId: input.transcriptionId,
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