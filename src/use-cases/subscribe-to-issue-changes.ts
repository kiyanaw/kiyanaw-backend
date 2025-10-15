import { services } from '../services';
import type { IssueSubscriptionEvent } from '../services/issueService';
import type { IssueData } from '../services/adt';
import { issueHighlightService } from '../services/issueHighlightService';
import { extractWords } from '../services/migrationService';

export interface SubscribeToIssueChangesConfig {
  transcriptionId: string;
  services: typeof services;
}

export class SubscribeToIssueChangesUseCase {
  constructor(private config: SubscribeToIssueChangesConfig) {}

  validate(): void {
    if (!this.config.transcriptionId || !this.config.transcriptionId.trim()) {
      throw new Error('transcriptionId is required');
    }
  }

  execute(): (() => void) | undefined {
    this.validate();

    const unsubscribe = this.config.services.issueService.subscribeToIssueChanges(
      this.config.transcriptionId,
      async (event) => {
        await this.handleIssueSubscriptionEvent(event);
      }
    );

    return unsubscribe;
  }

  async handleIssueSubscriptionEvent(event: IssueSubscriptionEvent): Promise<void> {
    const { mutation, issue } = event;
    
    const store = this.config.services.storeService;
    const flashService = this.config.services.flashIndicatorService;
    
    // Check if this is a self-triggered event using userLastUpdated
    const currentUser = this.config.services.userService.currentUser();
    const isSelfTriggered = currentUser && issue.userLastUpdated === currentUser.username;
    
    if (isSelfTriggered) {
      console.log('🔌 Self-triggered issue event, skipping:', issue.id);
      return;
    }

    console.log(`🔌 Processing remote issue ${mutation} event:`, issue.id);

    // Trigger flash indicator for all remote changes, except for commentCount-only updates
    // (comment changes are handled by comment subscriptions)
    const shouldFlash = mutation !== 'UPDATE' || this.isSignificantIssueUpdate(issue);
    if (shouldFlash && issue.owner && issue.regionId) {
      const displayUser = issue.ownerFriendly || issue.owner;
      flashService.flashIssue(issue.id, issue.regionId, displayUser);
    }

    switch (mutation) {
      case 'CREATE':
        store.addNewIssue(issue);
        await this.refreshRteHighlightingForRegion(issue.regionId);
        break;

      case 'UPDATE': {
        // Only update mutable fields to prevent overwriting local state
        const updates = {
          text: issue.text,
          type: issue.type,
          resolved: issue.resolved,
          commentCount: issue.commentCount,
          ownerFriendly: issue.ownerFriendly,
          // Include version if present for future conflict resolution
          _version: issue._version
        };
        store.updateIssue(issue.id, updates);
        await this.refreshRteHighlightingForRegion(issue.regionId);
        break;
      }

      case 'DELETE':
        store.deleteIssue(issue.id);
        await this.refreshRteHighlightingForRegion(issue.regionId);
        break;

      default:
        console.warn('🔌 Unknown issue mutation type:', mutation);
    }
  }

  /**
   * Determines if an issue update represents a significant change that should trigger a flash.
   * Returns false for commentCount-only updates (handled by comment subscriptions).
   */
  private isSignificantIssueUpdate(issue: IssueData): boolean {
    const store = this.config.services.storeService;
    const currentIssue = store.issueById(issue.id);
    
    if (!currentIssue) {
      // If we don't have the current issue, treat as significant
      return true;
    }
    
    // Check if only commentCount changed (and possibly _version)
    const significantFields = ['text', 'type', 'resolved', 'owner', 'ownerFriendly', 'regionId'];
    const hasSignificantChanges = significantFields.some(field => {
      return currentIssue[field as keyof IssueData] !== issue[field as keyof IssueData];
    });
    
    return hasSignificantChanges;
  }

  /**
   * Refresh RTE highlighting for a specific region after issue changes
   */
  private async refreshRteHighlightingForRegion(regionId: string): Promise<void> {
    const store = this.config.services.storeService;
    const rteService = this.config.services.rteService;
    
    // Get the region and its current issues
    const region = store.regionById(regionId);
    if (!region) {
      console.warn('🔌 Cannot refresh highlighting for unknown region:', regionId);
      return;
    }

    const issues = store.getIssuesForRegion(regionId);
    const issueHighlights = issueHighlightService.convertIssuesToHighlights(issues);
    // Extract words for highlighting using the migration helper
    const knownWords = extractWords(region.regionAnalysis);

    // Update highlighting for both main and translation editors if they exist
    const mainEditorKey = `${regionId}:main` as const;
    const translationEditorKey = `${regionId}:translation` as const;

    if (rteService.hasEditor(mainEditorKey)) {
      rteService.applyHighlighting(mainEditorKey, {
        knownWords,
        issues: issueHighlights
      });
    }

    if (rteService.hasEditor(translationEditorKey)) {
      rteService.applyHighlighting(translationEditorKey, {
        knownWords,
        issues: issueHighlights
      });
    }
  }
}
