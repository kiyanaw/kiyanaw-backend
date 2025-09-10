import { useCallback } from 'react';
import { NavigateIssueRegions } from '../use-cases/navigate-issue-regions';
import type { NavigateDirection } from '../use-cases/navigate-issue-regions';
import { useEditorStore } from '../stores/useEditorStore';

export const useNavigateIssueRegions = () => {
  return useCallback((direction: NavigateDirection) => {
    try {
      const store = useEditorStore.getState();
      return new NavigateIssueRegions({ direction, store }).execute();
    } catch (error) {
      console.error('Failed to navigate issue regions:', error);
      return null;
    }
  }, []);
};