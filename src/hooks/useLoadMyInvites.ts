import { useState, useEffect } from 'react';
import { services } from '../services';
import { useAuthStore } from '../stores/useAuthStore';
import type { InviteWithValidation } from '../services/inviteService';

/**
 * Adapter hook for loading all user invites
 * Loads all invites for the current user and provides pending count
 */
export const useLoadMyInvites = () => {
  const [invites, setInvites] = useState<InviteWithValidation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const user = useAuthStore((state) => state.user);

  const loadInvites = async () => {
    if (!user) {
      setInvites([]);
      setPendingCount(0);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Loading all invites for user:', user.username);
      
      const result = await services.inviteService.getMyInvites({
        userEmail: user.username
      });
      
      setInvites(result.invites);
      
      // Count pending invites
      const pending = result.invites.filter(invite => invite.validation.canAccept).length;
      setPendingCount(pending);

      console.log('✅ Invites loaded successfully:', { 
        total: result.total, 
        pending 
      });
    } catch (err) {
      console.error('❌ Failed to load invites:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load invitations';
      setError(errorMessage);
      setInvites([]);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, [user]);

  return {
    invites,
    loading,
    error,
    pendingCount,
    refresh: loadInvites
  };
}; 