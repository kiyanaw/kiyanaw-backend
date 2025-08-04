import React, { useState, useCallback } from 'react';
import { ConflictResolutionDialog } from '../components/conflicts/ConflictResolutionDialog';
import type { ConflictData, ConflictResolutionResult } from '../services/conflictResolutionService';

interface ConflictDialogState {
  isOpen: boolean;
  conflict: ConflictData | null;
  resolver: ((result: ConflictResolutionResult) => void) | null;
}

export const useConflictDialog = () => {
  const [dialogState, setDialogState] = useState<ConflictDialogState>({
    isOpen: false,
    conflict: null,
    resolver: null
  });

  const showConflictDialog = useCallback((conflict: ConflictData): Promise<ConflictResolutionResult> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        conflict,
        resolver: resolve
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
      resolver: null
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
      />
    );
  }, [dialogState.isOpen, dialogState.conflict, handleResolve]);

  return {
    showConflictDialog,
    ConflictDialogComponent
  };
}; 