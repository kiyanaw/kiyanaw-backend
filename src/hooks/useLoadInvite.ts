import { useInviteStore } from '../stores/useInviteStore';

export interface InviteValidation {
  isValid: boolean;
  isExpired: boolean;
  isPending: boolean;
  isAccepted: boolean;
  canAccept: boolean;
}

/**
 * Hook for accessing current invite store data - NO useEffect!
 * Components should call loadInviteById() imperatively when needed
 */
export const useLoadInvite = () => {
  const invite = useInviteStore((state) => state.currentInvite);
  const loading = useInviteStore((state) => state.currentInviteLoading);
  const error = useInviteStore((state) => state.currentInviteError);
  const validation = useInviteStore((state) => state.currentInviteValidation);
  const loadInviteById = useInviteStore((state) => state.loadInviteById);
  const clearCurrentInvite = useInviteStore((state) => state.clearCurrentInvite);

  return {
    invite,
    loading,
    error,
    validation,
    loadInviteById, // Expose the action to trigger loading
    clearCurrentInvite // Expose action to clear data
  };
}; 