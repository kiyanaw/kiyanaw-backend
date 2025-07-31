import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { services } from '../services';
import { InviteModel } from '../services/adt';
import type { InviteWithValidation } from '../services/inviteService';

interface InviteState {
  // All invites data
  invites: InviteWithValidation[];
  invitesLoading: boolean;
  invitesError: string | null;
  pendingCount: number;
  loadedForUser: string | null; // Track which user's data is loaded
  
  // Single invite data
  currentInvite: InviteModel | null;
  currentInviteLoading: boolean;
  currentInviteError: string | null;
  currentInviteValidation: {
    isValid: boolean;
    isExpired: boolean;
    isPending: boolean;
    isAccepted: boolean;
    canAccept: boolean;
  } | null;
  loadedInviteId: string | null; // Track which invite is loaded
  
  // Actions
  loadMyInvites: (userEmail: string) => Promise<void>;
  loadInviteById: (inviteId: string, userEmail: string) => Promise<void>;
  clearCurrentInvite: () => void;
  markInviteAsAccepted: (inviteId: string) => void;
  refresh: () => Promise<void>;
}

export const useInviteStore = create<InviteState>()(
  devtools(
    (set, get) => ({
      // Initial state
      invites: [],
      invitesLoading: false,
      invitesError: null,
      pendingCount: 0,
      loadedForUser: null,
      
      currentInvite: null,
      currentInviteLoading: false,
      currentInviteError: null,
      currentInviteValidation: null,
      loadedInviteId: null,
      
      // Load all invites for user
      loadMyInvites: async (userEmail: string) => {
        if (!userEmail) {
          set({
            invites: [],
            pendingCount: 0,
            invitesError: null,
            invitesLoading: false,
            loadedForUser: null
          });
          return;
        }

        const currentState = get();
        
        // Don't reload if already loading or data already loaded for this user
        if (currentState.invitesLoading || currentState.loadedForUser === userEmail) {
          return;
        }

        set({ invitesLoading: true, invitesError: null });

        try {
          console.log('🔄 Loading all invites for user:', userEmail);
          
          const result = await services.inviteService.getMyInvites({
            userEmail
          });
          
          // Count pending invites
          const pending = result.invites.filter(invite => invite.validation.canAccept).length;

          set({
            invites: result.invites,
            pendingCount: pending,
            invitesLoading: false,
            invitesError: null,
            loadedForUser: userEmail
          });

          console.log('✅ Invites loaded successfully:', { 
            total: result.total, 
            pending 
          });
        } catch (err) {
          console.error('❌ Failed to load invites:', err);
          const errorMessage = err instanceof Error ? err.message : 'Failed to load invitations';
          set({
            invitesError: errorMessage,
            invites: [],
            pendingCount: 0,
            invitesLoading: false,
            loadedForUser: null
          });
        }
      },

      // Load single invite by ID
      loadInviteById: async (inviteId: string, userEmail: string) => {
        if (!inviteId || !userEmail) {
          set({
            currentInvite: null,
            currentInviteValidation: null,
            currentInviteError: null,
            currentInviteLoading: false,
            loadedInviteId: null
          });
          return;
        }

        const currentState = get();
        
        // Don't reload if already loading or this invite is already loaded
        if (currentState.currentInviteLoading || currentState.loadedInviteId === inviteId) {
          return;
        }

        // First, check if we already have this invite in our loaded list
        const existingInvite = currentState.invites.find(item => item.invite.id === inviteId);
        if (existingInvite) {
          console.log('✅ Using cached invite data:', { 
            inviteId, 
            status: existingInvite.invite.status, 
            isValid: existingInvite.validation.isValid 
          });
          
          set({
            currentInvite: new InviteModel(existingInvite.invite),
            currentInviteValidation: existingInvite.validation,
            currentInviteLoading: false,
            currentInviteError: null,
            loadedInviteId: inviteId
          });
          return;
        }

        // If not in cache, make API call
        set({ currentInviteLoading: true, currentInviteError: null });

        try {
          console.log('🔄 Loading invite details from API:', inviteId);
          
          const inviteResult = await services.inviteService.getInviteById(inviteId, userEmail);
          
          if (!inviteResult) {
            set({
              currentInviteError: 'Invitation not found or you do not have permission to access it',
              currentInvite: null,
              currentInviteValidation: null,
              currentInviteLoading: false,
              loadedInviteId: null
            });
            return;
          }

          set({
            currentInvite: inviteResult.invite,
            currentInviteValidation: inviteResult.validation,
            currentInviteLoading: false,
            currentInviteError: null,
            loadedInviteId: inviteId
          });

          console.log('✅ Invite loaded from API:', { 
            inviteId, 
            status: inviteResult.invite.status, 
            isValid: inviteResult.validation.isValid 
          });
        } catch (err) {
          console.error('❌ Failed to load invite:', err);
          const errorMessage = err instanceof Error ? err.message : 'Failed to load invitation';
          set({
            currentInviteError: errorMessage,
            currentInvite: null,
            currentInviteValidation: null,
            currentInviteLoading: false,
            loadedInviteId: null
          });
        }
      },

      // Clear current invite
      clearCurrentInvite: () => {
        set({
          currentInvite: null,
          currentInviteValidation: null,
          currentInviteError: null,
          currentInviteLoading: false,
          loadedInviteId: null
        });
      },

      // Mark an invite as accepted and update counts
      markInviteAsAccepted: (inviteId: string) => {
        const currentState = get();
        
        // Update the invites list
        const updatedInvites = currentState.invites.map(inviteWithValidation => {
          if (inviteWithValidation.invite.id === inviteId) {
            return {
              ...inviteWithValidation,
              invite: {
                ...inviteWithValidation.invite,
                status: 'accepted',
                acceptedAt: new Date().toISOString()
              },
              validation: {
                ...inviteWithValidation.validation,
                isPending: false,
                isAccepted: true,
                canAccept: false
              }
            };
          }
          return inviteWithValidation;
        });

        // Recalculate pending count
        const newPendingCount = updatedInvites.filter(invite => invite.validation.canAccept).length;

        // Update current invite if it's the one being accepted
        let updatedCurrentInvite = currentState.currentInvite;
        let updatedCurrentValidation = currentState.currentInviteValidation;
        
        if (currentState.currentInvite?.id === inviteId) {
          updatedCurrentInvite = new InviteModel({
            ...currentState.currentInvite,
            status: 'accepted',
            acceptedAt: new Date().toISOString()
          });
          
          updatedCurrentValidation = {
            ...currentState.currentInviteValidation!,
            isPending: false,
            isAccepted: true,
            canAccept: false
          };
        }

        set({
          invites: updatedInvites,
          pendingCount: newPendingCount,
          currentInvite: updatedCurrentInvite,
          currentInviteValidation: updatedCurrentValidation
        });

        console.log('✅ Invite marked as accepted, pending count updated:', { 
          inviteId, 
          newPendingCount 
        });
      },

      // Refresh current data
      refresh: async () => {
        const state = get();
        // Re-load invites if we have them
        if (state.invites.length > 0) {
          // We need userEmail to refresh, but we can't get it here
          // This should be called from components that have access to userEmail
          console.log('Refresh called - should be triggered from component with userEmail');
        }
      }
    }),
    { name: 'InviteStore' }
  )
); 