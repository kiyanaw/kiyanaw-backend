import { SelectAndPlayRegion } from './select-and-play-region';
import { services } from '../services';

export type NavigateDirection = 'next' | 'prev';

interface NavigateIssueRegionsConfig {
  direction: NavigateDirection;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any; // useEditorStore instance with methods, not just state
}

/**
 * Navigates to the previous/next region that has at least one unresolved issue.
 * Regions are considered in their existing order in store (sorted by start time).
 */
export class NavigateIssueRegions {
  private config: NavigateIssueRegionsConfig;

  constructor(config: NavigateIssueRegionsConfig) {
    this.config = config;
  }

  execute(): string | null {
    const { store, direction } = this.config;

    // store is already the state from useEditorStore.getState()
    const regions = store.regions as Array<{ id: string }>;
    const issuesByRegionMap = store.issuesByRegionMap as Record<string, Array<{ resolved: boolean }>>;
    const selectedRegionId = store.selectedRegionId as string | null;

    if (!regions || regions.length === 0) {
      return null;
    }

    // Build a quick lookup set of regionIds that have unresolved issues
    const regionsWithOpenIssues = new Set<string>();
    Object.keys(issuesByRegionMap || {}).forEach((regionId) => {
      const issues = issuesByRegionMap[regionId] || [];
      if (issues.some((issue) => !issue.resolved)) {
        regionsWithOpenIssues.add(regionId);
      }
    });

    if (regionsWithOpenIssues.size === 0) {
      return null;
    }

    // Find current index
    const currentIndex = selectedRegionId
      ? regions.findIndex((r) => r.id === selectedRegionId)
      : -1;

    const step = direction === 'next' ? 1 : -1;
    let idx = currentIndex + step;

    // Wrap and iterate until we either circle back or find a match
    const visited = new Set<number>();
    
    for (let i = 0; i < regions.length; i++) {
      // Wrap around if needed
      if (idx >= regions.length) idx = 0;
      if (idx < 0) idx = regions.length - 1;
      
      // Check if we've been here before
      if (visited.has(idx)) break;
      visited.add(idx);
      
      const regionId = regions[idx].id;
      if (regionsWithOpenIssues.has(regionId)) {
        // Navigate
        new SelectAndPlayRegion({ regionId, services, store }).execute();
        return regionId;
      }
      
      idx += step;
    }

    return null;
  }
}

