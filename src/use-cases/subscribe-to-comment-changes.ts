import { services } from '../services';
import type { CommentSubscriptionEvent } from '../services/commentService';
import { issueHighlightService } from '../services/issueHighlightService';
import Timeout from 'smart-timeout';

export interface SubscribeToCommentChangesConfig {
  transcriptionId: string;
  services: typeof services;
}

// Module-level debounce registry for RTE refresh
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rteRefreshTimeouts = new Map<string, any>();

export class SubscribeToCommentChangesUseCase {
  constructor(private config: SubscribeToCommentChangesConfig) {}

  validate(): void {
    if (!this.config.transcriptionId || !this.config.transcriptionId.trim()) {
      throw new Error('transcriptionId is required');
    }
  }

  execute(): (() => void) | undefined {
    this.validate();

    const unsubscribe = this.config.services.commentService.subscribeToCommentChanges(
      this.config.transcriptionId,
      async (event) => {
        await this.handleCommentSubscriptionEvent(event);
      }
    );

    return unsubscribe;
  }

  async handleCommentSubscriptionEvent(event: CommentSubscriptionEvent): Promise<void> {
    const { mutation, comment } = event;
    
    const store = this.config.services.storeService;
    const flashService = this.config.services.flashIndicatorService;
    
    // Check if this is a self-triggered event
    const currentUser = this.config.services.userService.currentUser();
    const isSelfTriggered = currentUser && comment.author === currentUser.userId;
    
    if (isSelfTriggered) {
      console.log('🔌 Self-triggered comment event, skipping:', comment.id);
      return;
    }

    console.log(`🔌 Processing remote comment ${mutation} event:`, comment.id);

    switch (mutation) {
      case 'CREATE':
        store.addNewComment(comment);
        
        // Only handle issue comments for now
        if (comment.entityType === 'issue') {
          const issue = store.issueById(comment.entityId);
          if (issue) {
            // Flash the issue and its region
            flashService.flashIssue(issue.id, issue.regionId, comment.authorFriendly);
            
            // Refresh RTE highlighting for the region (debounced)
            await this.refreshRteHighlightingForRegion(issue.regionId);
          } else {
            console.warn('🔌 Comment CREATE for unknown issue:', comment.entityId);
          }
        }
        break;

      case 'DELETE':
        store.deleteComment(comment.id);
        
        // Only handle issue comments for now
        if (comment.entityType === 'issue') {
          const issue = store.issueById(comment.entityId);
          if (issue) {
            // Flash the issue and its region
            flashService.flashIssue(issue.id, issue.regionId, comment.authorFriendly);
            
            // Refresh RTE highlighting for the region (debounced)
            await this.refreshRteHighlightingForRegion(issue.regionId);
          } else {
            console.warn('🔌 Comment DELETE for unknown issue:', comment.entityId);
          }
        }
        break;

      default:
        console.warn('🔌 Unknown comment mutation type:', mutation);
    }
  }

  /**
   * Refresh RTE highlighting for a specific region after comment changes
   * Debounced to handle rapid comment bursts
   */
  private async refreshRteHighlightingForRegion(regionId: string): Promise<void> {
    const store = this.config.services.storeService;
    const rteService = this.config.services.rteService;
    
    // Clear existing timeout for this region
    const existingTimeoutId = rteRefreshTimeouts.get(regionId);
    if (existingTimeoutId) {
      Timeout.clear(existingTimeoutId);
    }

    // Set new debounced timeout
    const timeoutId = Timeout.set(`rte-refresh-${regionId}`, async () => {
      // Get the region and its current issues
      const region = store.regionById(regionId);
      if (!region) {
        console.warn('🔌 Cannot refresh highlighting for unknown region:', regionId);
        return;
      }

      const issues = store.getIssuesForRegion(regionId);
      const issueHighlights = issueHighlightService.convertIssuesToHighlights(issues);
      // Extract words for highlighting using the migration helper
      const knownWords = require('../services/migrationService').extractWords(region.regionAnalysis);

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

      // Clean up timeout reference
      rteRefreshTimeouts.delete(regionId);
    }, 200); // 200ms debounce

    rteRefreshTimeouts.set(regionId, timeoutId);
  }
}
