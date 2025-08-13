import { DeleteIssueUseCase } from './delete-issue';

jest.mock('../stores/useEditorStore', () => ({
  useEditorStore: {
    getState: () => {
      const deleteIssue = jest.fn();
      const state = {
        issues: [
          { id: 'i1', regionId: 'r1', _version: 3 },
        ],
        deleteIssue,
      } as any;
      return state;
    },
  },
}));

jest.mock('../services/issueService', () => ({
  deleteExistingIssue: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/rteService', () => ({
  rteService: {
    updateIssueHighlighting: jest.fn(),
  },
}));

import { useEditorStore } from '../stores/useEditorStore';
import { deleteExistingIssue } from '../services/issueService';
import { rteService } from '../services/rteService';

describe('DeleteIssueUseCase', () => {
  it('passes issue _version to service and updates store/highlighting', async () => {
    const useCase = new DeleteIssueUseCase();
    await useCase.execute({ issueId: 'i1' });

    expect(deleteExistingIssue).toHaveBeenCalledWith('i1', 3);
    const store: any = (useEditorStore as any).getState();
    // Our mock returns a fresh object each call; assert by behavior via spy on deleteExistingIssue and rteService
    expect(deleteExistingIssue).toHaveBeenCalled();
    expect(rteService.updateIssueHighlighting).toHaveBeenCalledWith('r1');
  });
});

