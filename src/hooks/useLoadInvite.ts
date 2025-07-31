import { useState, useEffect } from 'react';
import { InviteModel } from '../services/adt';
import { services } from '../services';
import { useAuthStore } from '../stores/useAuthStore';
import type { InviteWithValidation } from '../services/inviteService';

export interface InviteValidation {
  isValid: boolean;
  isExpired: boolean;
  isPending: boolean;
  isAccepted: boolean;
  canAccept: boolean;
}

/**
 * Adapter hook for loading invite details
 * Loads invite data on mount and provides loading state
 */
export const useLoadInvite = (inviteId: string | null) => {
  const [invite, setInvite] = useState<InviteModel | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<InviteValidation | null>(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!inviteId || !user) {
      setInvite(null);
      setValidation(null);
      setError(null);
      return;
    }

    const loadInvite = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('🔄 Loading invite details:', inviteId);
        
        const inviteResult = await services.inviteService.getInviteById(inviteId, user.username);
        
        if (!inviteResult) {
          setError('Invitation not found or you do not have permission to access it');
          setInvite(null);
          setValidation(null);
          return;
        }

        setInvite(inviteResult.invite);
        setValidation(inviteResult.validation);

        console.log('✅ Invite loaded successfully:', { 
          inviteId, 
          status: inviteResult.invite.status, 
          isValid: inviteResult.validation.isValid 
        });
      } catch (err) {
        console.error('❌ Failed to load invite:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load invitation';
        setError(errorMessage);
        setInvite(null);
        setValidation(null);
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [inviteId, user]);

  return {
    invite,
    loading,
    error,
    validation
  };
}; 