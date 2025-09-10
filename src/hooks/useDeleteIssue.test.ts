import { act, renderHook } from '@testing-library/react';

jest.mock('../use-cases/delete-issue', () => {
  return {
    DeleteIssueUseCase: jest.fn().mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

import { DeleteIssueUseCase } from '../use-cases/delete-issue';
import { useDeleteIssue } from './useDeleteIssue';

describe('useDeleteIssue', () => {
  it('exposes a callable delete function', async () => {
    const { result } = renderHook(() => useDeleteIssue());
    expect(typeof result.current).toBe('function');
    await act(async () => {
      await result.current({ issueId: 'i1' });
    });
    expect(DeleteIssueUseCase).toHaveBeenCalledWith({ issueId: 'i1' });
    const instance = (DeleteIssueUseCase as jest.Mock).mock.results[0].value;
    expect(instance.execute).toHaveBeenCalledWith();
  });
});

