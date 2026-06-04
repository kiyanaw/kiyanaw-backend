// Mock for inviteService
export const getMyInvites = jest.fn().mockResolvedValue({
  invites: [],
  total: 0,
  filters: {
    userEmail: 'test@example.com',
    transcriptionId: null,
    inviteId: null
  }
});

// Export other functions that might be imported
export const sendInvite = jest.fn();
export const acceptInvite = jest.fn();
export const loadInvitesForTranscription = jest.fn().mockResolvedValue([]);
export const getInviteById = jest.fn().mockResolvedValue(null);
export const revokeInvite = jest.fn();
export const renewInvite = jest.fn();
export const updateInvitePermission = jest.fn();
