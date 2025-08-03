import type { ConflictData, ConflictResolutionResult } from './conflictResolutionService';

/**
 * Global conflict dialog manager that bridges service layer with React components
 */
class ConflictDialogManager {
  private showDialogFn: ((conflict: ConflictData) => Promise<ConflictResolutionResult>) | null = null;

  setDialogFunction(showDialog: (conflict: ConflictData) => Promise<ConflictResolutionResult>) {
    this.showDialogFn = showDialog;
  }

  async showDialog(conflict: ConflictData): Promise<ConflictResolutionResult> {
    if (!this.showDialogFn) {
      console.warn('No dialog function registered, falling back to accept remote');
      return { action: 'accept_remote' };
    }

    return this.showDialogFn(conflict);
  }

  isReady(): boolean {
    return this.showDialogFn !== null;
  }
}

export const conflictDialogManager = new ConflictDialogManager(); 