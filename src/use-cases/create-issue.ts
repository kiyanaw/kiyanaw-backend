import { createIssueForRegion } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
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

      // Update the store with the new issue
      const store = useEditorStore.getState();
      const currentIssues = store.issues;
      const updatedIssues = [newIssue, ...currentIssues];
      
      // Update issues and rebuild the issues by region map
      const issuesByRegionMap: Record<string, IssueData[]> = {};
      updatedIssues.forEach((issue) => {
        if (!issuesByRegionMap[issue.regionId]) {
          issuesByRegionMap[issue.regionId] = [];
        }
        issuesByRegionMap[issue.regionId].push(issue);
      });

      // Update the store
      store.setEditorData({
        issues: updatedIssues,
        issuesByRegionMap,
      });

      return newIssue;
    } catch (error) {
      console.error('Failed to create issue:', error);
      throw error;
    }
  }
}