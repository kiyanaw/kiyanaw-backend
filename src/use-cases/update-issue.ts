import { updateExistingIssue } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import { rteService } from '../services/rteService';
import type { IssueData } from '../services/adt';

export interface UpdateIssueInput {
  issueId: string;
  updates: Partial<IssueData>;
}

export class UpdateIssueUseCase {
  constructor() {}

  validate(input: UpdateIssueInput): void {
    if (!input.issueId) {
      throw new Error('Issue ID is required');
    }
    if (!input.updates || Object.keys(input.updates).length === 0) {
      throw new Error('Updates are required');
    }
  }

  async execute(input: UpdateIssueInput): Promise<IssueData> {
    this.validate(input);

    try {
      // Get the current issue and its version from the store
      const store = useEditorStore.getState();
      const currentIssue = store.issueById(input.issueId);
      if (!currentIssue) {
        throw new Error(`Issue ${input.issueId} not found`);
      }

      // Create optimistic update for immediate UI feedback
      const optimisticUpdate = { ...currentIssue, ...input.updates };

      // 1. Update the store immediately (optimistic update)
      store.updateIssue(input.issueId, optimisticUpdate);

      // 2. Update text editor highlighting immediately
      rteService.updateIssueHighlighting(optimisticUpdate.regionId);

      // 3. Save to backend (async, in background)
      const updatedIssue = await updateExistingIssue(input.issueId, input.updates, currentIssue._version || 0);

      // 4. Update store with server response (in case server changed anything)
      store.updateIssue(input.issueId, updatedIssue);

      return updatedIssue;
    } catch (error) {
      console.error('Failed to update issue:', error);
      throw error;
    }
  }
}