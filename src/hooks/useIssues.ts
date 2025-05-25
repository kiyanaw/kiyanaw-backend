import { useState, useEffect, useCallback } from 'react';
import { DataStore } from '@aws-amplify/datastore';
import { Issue, Transcription } from '../models';
import { eventBus } from '../lib/eventBus';

export interface IssueState {
  issues: any[];
  issueMap: Record<string, any>;
  loading: boolean;
  error: string | null;
}

export const useIssues = (transcriptionId?: string) => {
  const [state, setState] = useState<IssueState>({
    issues: [],
    issueMap: {},
    loading: false,
    error: null,
  });

  const setIssues = useCallback((issues: any[]) => {
    const map: Record<string, any> = {};
    issues.forEach((issue) => {
      map[issue.id] = issue;
    });

    setState((prev) => ({
      ...prev,
      issues: issues.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      issueMap: map,
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const loadIssues = useCallback(
    async (transcriptionId: string) => {
      try {
        setLoading(true);
        setError(null);

        // Load issues for this transcription
        const issues = await DataStore.query(Issue, (i: any) =>
          i.transcription.id.eq(transcriptionId)
        );

        // Parse comments from JSON strings
        const issuesWithComments = issues.map((issue: any) => {
          let comments = [];
          try {
            comments = issue.comments ? JSON.parse(issue.comments) : [];
          } catch (e) {
            console.warn('Failed to parse comments for issue:', issue.id);
            comments = [];
          }
          return {
            ...issue,
            comments: comments.sort(
              (a: any, b: any) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            ),
          };
        });

        setIssues(issuesWithComments);
      } catch (error) {
        console.error('Error loading issues:', error);
        setError('Failed to load issues');
      } finally {
        setLoading(false);
      }
    },
    [setIssues, setLoading, setError]
  );

  const createIssue = useCallback(
    async (issueData: {
      text: string;
      type: string;
      owner: string;
      regionId?: string;
      resolved: boolean;
    }) => {
      try {
        if (!transcriptionId) return;

        const transcription = await DataStore.query(
          Transcription,
          transcriptionId
        );
        if (!transcription) return;

        // Get the next index for this transcription
        const existingIssues = await DataStore.query(Issue, (i: any) =>
          i.transcription.id.eq(transcriptionId)
        );
        const nextIndex = existingIssues.length + 1;

        const newIssue = await DataStore.save(
          new Issue({
            text: issueData.text,
            type: issueData.type,
            owner: issueData.owner,
            resolved: issueData.resolved,
            index: nextIndex,
            regionId: issueData.regionId || '',
            transcription,
            comments: JSON.stringify([]),
          })
        );

        // Add to local state with optimistic update
        const issueWithComments = { ...newIssue, comments: [] };
        setState((prev) => ({
          ...prev,
          issues: [issueWithComments, ...prev.issues],
          issueMap: {
            ...prev.issueMap,
            [newIssue.id]: issueWithComments,
          },
        }));

        eventBus.emit('issue-created', newIssue);
        return newIssue;
      } catch (error) {
        console.error('Error creating issue:', error);
        setError('Failed to create issue');
      }
    },
    [transcriptionId]
  );

  const updateIssue = useCallback(
    async (issueId: string, updates: Partial<any>) => {
      try {
        const issue = state.issueMap[issueId];
        if (!issue) return;

        // Optimistic update
        const optimisticIssue = {
          ...issue,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        setState((prev) => ({
          ...prev,
          issueMap: {
            ...prev.issueMap,
            [issueId]: optimisticIssue,
          },
          issues: prev.issues.map((i) =>
            i.id === issueId ? optimisticIssue : i
          ),
        }));

        // Actual update
        const updated = await DataStore.save(
          Issue.copyOf(issue, (draft) => {
            Object.assign(draft, updates);
          })
        );

        // Update with actual result
        setState((prev) => ({
          ...prev,
          issueMap: {
            ...prev.issueMap,
            [issueId]: { ...updated, comments: issue.comments },
          },
          issues: prev.issues.map((i) =>
            i.id === issueId ? { ...updated, comments: issue.comments } : i
          ),
        }));

        eventBus.emit('issue-updated', updated);
      } catch (error) {
        console.error('Error updating issue:', error);
        setError('Failed to update issue');
        // Revert optimistic update
        setState((prev) => ({
          ...prev,
          issueMap: {
            ...prev.issueMap,
            [issueId]: state.issueMap[issueId],
          },
          issues: prev.issues.map((i) =>
            i.id === issueId ? state.issueMap[issueId] : i
          ),
        }));
      }
    },
    [state.issueMap]
  );

  const deleteIssue = useCallback(
    async (issueId: string) => {
      try {
        const issue = state.issueMap[issueId];
        if (!issue) return;

        // Optimistic update
        setState((prev) => {
          const newIssueMap = { ...prev.issueMap };
          delete newIssueMap[issueId];
          return {
            ...prev,
            issueMap: newIssueMap,
            issues: prev.issues.filter((i) => i.id !== issueId),
          };
        });

        // Delete comments first
        if (issue.comments && issue.comments.length > 0) {
          await Promise.all(
            issue.comments.map((comment: any) => DataStore.delete(comment))
          );
        }

        // Delete the issue
        await DataStore.delete(issue);

        eventBus.emit('issue-deleted', issueId);
      } catch (error) {
        console.error('Error deleting issue:', error);
        setError('Failed to delete issue');
        // Revert optimistic update
        setState((prev) => ({
          ...prev,
          issueMap: {
            ...prev.issueMap,
            [issueId]: state.issueMap[issueId],
          },
          issues: [...prev.issues, state.issueMap[issueId]].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ),
        }));
      }
    },
    [state.issueMap]
  );

  const addComment = useCallback(
    async (
      issueId: string,
      commentData: {
        text: string;
        author: string;
      }
    ) => {
      try {
        const issue = state.issueMap[issueId];
        if (!issue) return;

        const newComment = {
          id: `comment-${Date.now()}-${Math.random()}`,
          text: commentData.text,
          author: commentData.author,
          createdAt: new Date().toISOString(),
        };

        // Update comments in the issue
        const existingComments = issue.comments || [];
        const updatedComments = [...existingComments, newComment];

        const updatedIssue = await DataStore.save(
          Issue.copyOf(issue, (draft) => {
            draft.comments = JSON.stringify(updatedComments);
          })
        );

        // Update local state
        setState((prev) => {
          const issueWithComments = {
            ...updatedIssue,
            comments: updatedComments,
          };
          return {
            ...prev,
            issueMap: {
              ...prev.issueMap,
              [issueId]: issueWithComments,
            },
            issues: prev.issues.map((i) =>
              i.id === issueId ? issueWithComments : i
            ),
          };
        });

        eventBus.emit('comment-added', { issueId, comment: newComment });
        return newComment;
      } catch (error) {
        console.error('Error adding comment:', error);
        setError('Failed to add comment');
      }
    },
    [state.issueMap]
  );

  // Set up subscriptions when transcriptionId changes
  useEffect(() => {
    if (!transcriptionId) return;

    const issueSubscription = DataStore.observeQuery(Issue, (i) =>
      i.transcription.id.eq(transcriptionId)
    ).subscribe(() => {
      // Reload issues with comments when there are changes
      loadIssues(transcriptionId);
    });

    // No separate comment subscription needed since comments are stored in issues

    return () => {
      issueSubscription.unsubscribe();
    };
  }, [transcriptionId, loadIssues]);

  return {
    ...state,
    loadIssues,
    createIssue,
    updateIssue,
    deleteIssue,
    addComment,
    // Computed getters
    issueById: (id: string) => state.issueMap[id],
    issuesByRegion: (regionId: string) =>
      state.issues.filter((issue) => issue.region?.id === regionId),
    openIssues: state.issues.filter((issue) => !issue.resolved),
    resolvedIssues: state.issues.filter((issue) => issue.resolved),
  };
};
