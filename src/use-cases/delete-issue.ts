import { deleteExistingIssue } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import { rteService } from '../services/rteService';

export interface DeleteIssueInput {
  issueId: string;
}

export class DeleteIssueUseCase {
  constructor() {}

  validate(input: DeleteIssueInput): void {
    if (!input.issueId) {
      throw new Error('Issue ID is required');
    }
  }

  async execute(input: DeleteIssueInput): Promise<void> {
    this.validate(input);

    try {
      // Get the issue's regionId before deleting it
      const store = useEditorStore.getState();
      const issue = store.issues.find(i => i.id === input.issueId);
      const regionId = issue?.regionId;

      // Delete the issue via the service
      await deleteExistingIssue(input.issueId);

      // Update the store by removing the deleted issue using the proper store method
      store.deleteIssue(input.issueId);

      // Update text editor highlighting for the affected region
      if (regionId) {
        rteService.updateIssueHighlighting(regionId);
      }
    } catch (error) {
      console.error('Failed to delete issue:', error);
      throw error;
    }
  }
}