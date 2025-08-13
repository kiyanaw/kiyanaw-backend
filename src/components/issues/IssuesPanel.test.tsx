import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { IssuesPanel } from './IssuesPanel';

// Mock auth store so currentUserId matches issue.owner and delete button renders
jest.mock('../../stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: any) => any) => selector({ user: { userId: 'u1' } }),
}));

describe('IssuesPanel deletion', () => {
  const baseIssue = {
    id: 'i1',
    text: 'word',
    type: 'new-word' as const,
    owner: 'u1',
    ownerFriendly: 'User',
    regionId: 'r1',
    resolved: false,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    commentCount: 0,
  };

  beforeEach(() => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    (window.confirm as jest.Mock).mockRestore?.();
  });

  it('asks for confirmation and calls onDeleteIssue when confirmed', () => {
    const onDeleteIssue = jest.fn();
    render(
      <IssuesPanel
        selectedRegionId={'r1'}
        issues={[baseIssue]}
        canEdit={true}
        // Ensure ownership so the delete button renders
        // currentUserId must match issue.owner
        // @ts-ignore - prop is optional in the component
        currentUserId={'u1'}
        onUpdateIssue={jest.fn()}
        onDeleteIssue={onDeleteIssue}
      />
    );

    // Click the delete button (trash icon) in the row
    const trash = screen.getByTitle('Delete issue');
    fireEvent.click(trash);

    expect(window.confirm).toHaveBeenCalled();
    expect(onDeleteIssue).toHaveBeenCalledWith('i1');
  });

  it('aborts deletion when user cancels confirmation', () => {
    (window.confirm as jest.Mock).mockReturnValueOnce(false);
    const onDeleteIssue = jest.fn();
    render(
      <IssuesPanel
        selectedRegionId={'r1'}
        issues={[baseIssue]}
        canEdit={true}
        // @ts-ignore
        currentUserId={'u1'}
        onUpdateIssue={jest.fn()}
        onDeleteIssue={onDeleteIssue}
      />
    );

    const trash = screen.getByTitle('Delete issue');
    fireEvent.click(trash);

    expect(window.confirm).toHaveBeenCalled();
    expect(onDeleteIssue).not.toHaveBeenCalled();
  });
});

