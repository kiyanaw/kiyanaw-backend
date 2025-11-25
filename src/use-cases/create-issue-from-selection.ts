import { useEditorStore } from '../stores/useEditorStore';
import { currentUser, currentUserFriendly } from '../services/userService';
import { CreateIssueUseCase } from './create-issue';
import type { IssueData } from '../services/adt';
import { ISSUE_TYPES } from '../services/adt';

export class CreateIssueFromSelectionUseCase {
  constructor() {}

  async execute(): Promise<IssueData> {
    const store = useEditorStore.getState();

    // Get current selection info
    const selectedRegionId = store.selectedRegionId;
    if (!selectedRegionId) {
      throw new Error('No region selected');
    }

    const regionSelection = store.regionSelections[selectedRegionId];
    if (!regionSelection || regionSelection.length === 0) {
      throw new Error('No text selected');
    }

    const selectedText = regionSelection.text.trim();
    if (!selectedText) {
      throw new Error('Selected text is empty');
    }

    // Get current user using user service
    const user = currentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const userFriendly = currentUserFriendly();
    if (!userFriendly) {
      throw new Error('Could not determine user friendly name');
    }

    // Get transcription ID
    const transcription = store.transcription;
    if (!transcription) {
      throw new Error('No transcription loaded');
    }

    // Create the issue using the existing CreateIssueUseCase
    const createIssueUseCase = new CreateIssueUseCase({
      text: selectedText,
      type: ISSUE_TYPES.NEEDS_HELP,
      owner: user.userId,
      ownerFriendly: userFriendly,
      regionId: selectedRegionId,
      transcriptionId: transcription.id
    });
    return await createIssueUseCase.execute();
  }
}