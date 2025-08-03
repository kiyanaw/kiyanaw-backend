import React, { useState, useCallback } from 'react';
import { ConflictResolutionDialog } from '../components/conflicts/ConflictResolutionDialog';
import type { ConflictData, ConflictResolutionResult } from '../services/conflictResolutionService';

interface ConflictDialogState {
  isOpen: boolean;
  conflict: ConflictData | null;
  resolver: ((result: ConflictResolutionResult) => void) | null;
  rejecter: ((reason?: unknown) => void) | null;
}

export const useConflictDialog = () => {
  const [dialogState, setDialogState] = useState<ConflictDialogState>({
    isOpen: false,
    conflict: null,
    resolver: null,
    rejecter: null
  });

  const showConflictDialog = useCallback((conflict: ConflictData): Promise<ConflictResolutionResult> => {
    return new Promise((resolve, reject) => {
      setDialogState({
        isOpen: true,
        conflict,
        resolver: resolve,
        rejecter: reject
      });
    });
  }, []);

  const handleResolve = useCallback((result: ConflictResolutionResult) => {
    if (dialogState.resolver) {
      dialogState.resolver(result);
    }
    setDialogState({
      isOpen: false,
      conflict: null,
      resolver: null,
      rejecter: null
    });
  }, [dialogState]);

  const handleCancel = useCallback(() => {
    if (dialogState.rejecter) {
      dialogState.rejecter(new Error('User cancelled conflict resolution'));
    }
    setDialogState({
      isOpen: false,
      conflict: null,
      resolver: null,
      rejecter: null
    });
  }, [dialogState]);

  const ConflictDialogComponent = useCallback(() => {
    if (!dialogState.isOpen || !dialogState.conflict) {
      return null;
    }

    return (
      <ConflictResolutionDialog
        conflict={dialogState.conflict}
        onResolve={handleResolve}
        onCancel={handleCancel}
      />
    );
  }, [dialogState.isOpen, dialogState.conflict, handleResolve, handleCancel]);

  return {
    showConflictDialog,
    ConflictDialogComponent
  };
}; 