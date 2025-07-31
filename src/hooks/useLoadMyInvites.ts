import { useInviteStore } from '../stores/useInviteStore';

/**
 * Hook for accessing invite store data - NO useEffect!
 * Components should call loadMyInvites() imperatively when needed
 */
export const useLoadMyInvites = () => {
  const invites = useInviteStore((state) => state.invites);
  const loading = useInviteStore((state) => state.invitesLoading);
  const error = useInviteStore((state) => state.invitesError);
  const pendingCount = useInviteStore((state) => state.pendingCount);
  const loadMyInvites = useInviteStore((state) => state.loadMyInvites);

  return {
    invites,
    loading,
    error,
    pendingCount,
    loadMyInvites, // Expose the action to trigger loading
    refresh: loadMyInvites // Alias for refresh
  };
}; 