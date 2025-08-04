import type { ConflictData, ConflictResolutionResult } from './conflictResolutionService';

/**
 * Global conflict dialog manager that bridges service layer with React components
 */
class ConflictDialogManager {
  private showDialogFn: ((conflict: ConflictData) => Promise<ConflictResolutionResult>) | null = null;
  private updateDialogFn: ((conflict: ConflictData) => void) | null = null;

  setDialogFunction(showDialog: (conflict: ConflictData) => Promise<ConflictResolutionResult>) {
    this.showDialogFn = showDialog;
  }

  setUpdateFunction(updateDialog: (conflict: ConflictData) => void) {
    this.updateDialogFn = updateDialog;
  }

  async showDialog(conflict: ConflictData): Promise<ConflictResolutionResult> {
    if (!this.showDialogFn) {
      console.warn('No dialog function registered, falling back to accept remote');
      return { action: 'accept_remote' };
    }

    return this.showDialogFn(conflict);
  }

  async updateDialog(conflict: ConflictData): Promise<void> {
    if (this.updateDialogFn) {
      console.log('🔄 Updating active conflict dialog with latest remote data:', {
        regionId: conflict.regionId,
        field: conflict.field,
        newRemoteVersion: conflict.remoteVersion
      });
      this.updateDialogFn(conflict);
    }
  }

  isReady(): boolean {
    return this.showDialogFn !== null;
  }
}

export const conflictDialogManager = new ConflictDialogManager(); 