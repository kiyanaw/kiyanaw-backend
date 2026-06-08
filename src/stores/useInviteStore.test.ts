import { useInviteStore } from './useInviteStore';

jest.mock('../services');

describe('useInviteStore', () => {
  beforeEach(() => {
    useInviteStore.setState({
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
    });
  });

  describe('reset()', () => {
    it('clears invites list and resets pending count', () => {
      useInviteStore.setState({
        invites: [{ invite: { id: 'inv-1' }, validation: { canAccept: true } }] as any,
        pendingCount: 1,
        invitesLoading: false,
        invitesError: null,
        loadedForUser: 'user-a@example.com',
      });

      useInviteStore.getState().reset();

      const state = useInviteStore.getState();
      expect(state.invites).toEqual([]);
      expect(state.pendingCount).toBe(0);
      expect(state.invitesLoading).toBe(false);
      expect(state.invitesError).toBeNull();
      expect(state.loadedForUser).toBeNull();
    });
  });
});
