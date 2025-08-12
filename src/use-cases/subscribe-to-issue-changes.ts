import { services } from '../services';
import type { IssueSubscriptionEvent } from '../services/issueService';
import { issueHighlightService } from '../services/issueHighlightService';

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
    
    // Check if this is a self-triggered event
    const currentUser = this.config.services.userService.currentUser();
    const isSelfTriggered = currentUser && issue.owner === currentUser.userId;
    
    if (isSelfTriggered) {
      // For self-triggered events, just update version if we're tracking issue versions
      // For now, we'll skip version tracking and just return
      console.log('🔌 Self-triggered issue event, skipping:', issue.id);
      return;
    }

    console.log(`🔌 Processing remote issue ${mutation} event:`, issue.id);

    switch (mutation) {
      case 'CREATE':
        store.addNewIssue(issue);
        await this.refreshRteHighlightingForRegion(issue.regionId);
        break;

      case 'UPDATE':
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

      case 'DELETE':
        store.deleteIssue(issue.id);
        await this.refreshRteHighlightingForRegion(issue.regionId);
        break;

      default:
        console.warn('🔌 Unknown issue mutation type:', mutation);
    }
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
    const knownWords = region.regionAnalysis || [];

    // Update highlighting for both main and translation editors if they exist
    const mainEditorKey = `${regionId}:main` as const;
    const translationEditorKey = `${regionId}:translation` as const;

    if (rteService.hasEditor(mainEditorKey)) {
      if (typeof rteService.applyHighlighting === 'function') {
        rteService.applyHighlighting(mainEditorKey, {
          knownWords,
          issues: issueHighlights
        });
      } else {
        // Fallback to known words only if applyHighlighting is not available
        rteService.applyKnownWordsFormatting(mainEditorKey, knownWords);
      }
    }

    if (rteService.hasEditor(translationEditorKey)) {
      if (typeof rteService.applyHighlighting === 'function') {
        rteService.applyHighlighting(translationEditorKey, {
          knownWords,
          issues: issueHighlights
        });
      } else {
        // Fallback to known words only if applyHighlighting is not available
        rteService.applyKnownWordsFormatting(translationEditorKey, knownWords);
      }
    }
  }
}