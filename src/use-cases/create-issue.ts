import { createIssueForRegion } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import { rteService } from '../services/rteService';
import type { IssueData } from '../services/adt';

export interface CreateIssueInput {
  text: string;
  type: string;
  owner: string;
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
    if (!input.transcriptionId) {
      throw new Error('Transcription ID is required');
    }
  }

  async execute(input: CreateIssueInput): Promise<IssueData> {
    this.validate(input);

    try {
      // Create the issue via the service
      const newIssue = await createIssueForRegion({
        text: input.text.trim(),
        type: input.type,
        owner: input.owner,
        regionId: input.regionId || '',
        transcriptionId: input.transcriptionId,
      });

      // Update the store with the new issue using the proper store method
      const store = useEditorStore.getState();
      store.addNewIssue(newIssue);

      // Update text editor highlighting for the affected region
      rteService.updateIssueHighlighting(newIssue.regionId);

      return newIssue;
    } catch (error) {
      console.error('Failed to create issue:', error);
      throw error;
    }
  }
}