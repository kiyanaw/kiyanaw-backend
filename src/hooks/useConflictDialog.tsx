import { useState, useCallback, useEffect } from 'react';
import { ConflictResolutionDialog } from '../components/conflicts/ConflictResolutionDialog';
import { conflictDialogManager } from '../services/conflictDialogManager';
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

  const updateConflictDialog = useCallback((updatedConflict: ConflictData) => {
    setDialogState(prevState => {
      if (prevState.isOpen && prevState.conflict) {
        return {
          ...prevState,
          conflict: updatedConflict
        };
      }
      return prevState;
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

  // Register the update function with the dialog manager
  useEffect(() => {
    conflictDialogManager.setUpdateFunction(updateConflictDialog);
  }, [updateConflictDialog]);

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
    updateConflictDialog,
    ConflictDialogComponent
  };
}; 