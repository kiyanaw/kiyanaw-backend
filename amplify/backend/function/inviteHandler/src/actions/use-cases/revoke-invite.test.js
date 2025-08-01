const { RevokeInviteUseCase } = require('./revoke-invite');

// Mock AWS SDK
const mockSend = jest.fn();
const mockGetCommand = jest.fn();
const mockUpdateCommand = jest.fn();
const mockDynamoDBClient = jest.fn();
const mockDynamoDBDocumentClient = jest.fn();

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({}))
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({
      send: mockSend
    }))
  },
  GetCommand: mockGetCommand,
  UpdateCommand: mockUpdateCommand
}));

describe('RevokeInviteUseCase', () => {
  let validConfig;
  let mockInviteService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment variables
    process.env.REGION = 'us-east-1';
    process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME = 'test-transcription-table';
    
    // Setup mock invite service
    mockInviteService = {
      getInviteById: jest.fn(),
      deleteInvite: jest.fn()
    };
    
    // Setup valid config
    validConfig = {
      inviteId: 'invite-123',
      requestorUserId: 'user-456',
      inviteService: mockInviteService
    };

    // Setup default mock returns
    mockInviteService.getInviteById.mockResolvedValue({
      id: 'invite-123',
      email: 'invitee@example.com',
      transcriptionId: 'trans-789',
      status: 'pending',
      permissionLevel: 'editor',
      invitedBy: 'user-456',
      invitedByFriendly: 'John Doe',
      createdAt: '2024-01-01T00:00:00.000Z',
      expiresAt: '2024-01-08T00:00:00.000Z'
    });

    mockInviteService.deleteInvite.mockResolvedValue();
  });

  describe('validation', () => {
    it('should throw error when inviteId is missing', async () => {
      const config = { ...validConfig, inviteId: null };
      const useCase = new RevokeInviteUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('Invite ID is required');
    });

    it('should throw error when inviteId is not a string', async () => {
      const config = { ...validConfig, inviteId: 123 };
      const useCase = new RevokeInviteUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('Invite ID is required');
    });

    it('should throw error when requestorUserId is missing', async () => {
      const config = { ...validConfig, requestorUserId: null };
      const useCase = new RevokeInviteUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('Requestor user ID is required');
    });

    it('should throw error when requestorUserId is not a string', async () => {
      const config = { ...validConfig, requestorUserId: 123 };
      const useCase = new RevokeInviteUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('Requestor user ID is required');
    });

    it('should throw error when inviteService is missing', async () => {
      const config = { ...validConfig, inviteService: null };
      const useCase = new RevokeInviteUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('Invite service is required');
    });
  });

  describe('execute', () => {
    it('should get invite details first', async () => {
      const useCase = new RevokeInviteUseCase(validConfig);
      await useCase.execute();

      expect(mockInviteService.getInviteById).toHaveBeenCalledWith('invite-123');
    });

    it('should throw error when invite is not found', async () => {
      mockInviteService.getInviteById.mockResolvedValue(null);
      
      const useCase = new RevokeInviteUseCase(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow('Invite invite-123 not found');
    });

    it('should verify authorization - only invite sender can revoke', async () => {
      // Setup invite sent by different user
      mockInviteService.getInviteById.mockResolvedValue({
        id: 'invite-123',
        email: 'invitee@example.com',
        transcriptionId: 'trans-789',
        status: 'pending',
        permissionLevel: 'editor',
        invitedBy: 'different-user-999', // Different from requestorUserId
        invitedByFriendly: 'Jane Doe'
      });
      
      const useCase = new RevokeInviteUseCase(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow(
        'Unauthorized: Only the person who sent the invite can revoke it. Invite was sent by "different-user-999" but revoke requested by "user-456"'
      );
    });

    it('should delete invite for pending invitation', async () => {
      const useCase = new RevokeInviteUseCase(validConfig);
      await useCase.execute();

      expect(mockInviteService.deleteInvite).toHaveBeenCalledWith('invite-123');
    });

    it('should return revoke result for pending invitation', async () => {
      const useCase = new RevokeInviteUseCase(validConfig);
      const result = await useCase.execute();

      expect(result).toEqual({
        inviteId: 'invite-123',
        email: 'invitee@example.com',
        transcriptionId: 'trans-789',
        wasAccepted: false,
        permissionLevel: 'editor'
      });
    });

    it('should handle invite service errors gracefully', async () => {
      const serviceError = new Error('Database connection failed');
      mockInviteService.getInviteById.mockRejectedValue(serviceError);
      
      const useCase = new RevokeInviteUseCase(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow('Database connection failed');
    });
  });

  describe('ACL cleanup for accepted invitations', () => {
    beforeEach(() => {
      // Setup accepted invitation
      mockInviteService.getInviteById.mockResolvedValue({
        id: 'invite-123',
        email: 'invitee@example.com',
        transcriptionId: 'trans-789',
        status: 'accepted',
        permissionLevel: 'editor',
        invitedBy: 'user-456',
        invitedByFriendly: 'John Doe',
        acceptedByUserId: 'user-999'
      });

      // Setup DynamoDB mock responses
      mockSend.mockResolvedValueOnce({
        Item: {
          id: 'trans-789',
          title: 'Test Transcription',
          editors: ['user-999', 'other-user'],
          viewers: ['viewer-user']
        }
      }).mockResolvedValueOnce({
        Attributes: {
          id: 'trans-789',
          title: 'Test Transcription',
          editors: ['other-user'],
          viewers: ['viewer-user'],
          dateLastUpdated: expect.any(String)
        }
      });
    });

    it('should remove user from transcription ACLs when invite was accepted', async () => {
      const useCase = new RevokeInviteUseCase(validConfig);
      await useCase.execute();

      // Should get transcription first
      expect(mockGetCommand).toHaveBeenCalledWith({
        TableName: 'test-transcription-table',
        Key: { id: 'trans-789' }
      });

      // Should update transcription to remove user
      expect(mockUpdateCommand).toHaveBeenCalledWith({
        TableName: 'test-transcription-table',
        Key: { id: 'trans-789' },
        UpdateExpression: 'SET #list = :updatedList, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#list': 'editors',
          '#updatedAt': 'dateLastUpdated'
        },
        ExpressionAttributeValues: {
          ':updatedList': ['other-user'], // user-999 removed
          ':updatedAt': expect.any(String)
        },
        ReturnValues: 'ALL_NEW'
      });
    });

    it('should remove user from viewers list for viewer permission', async () => {
      // Setup viewer invitation
      mockInviteService.getInviteById.mockResolvedValue({
        id: 'invite-123',
        email: 'viewer@example.com',
        transcriptionId: 'trans-789',
        status: 'accepted',
        permissionLevel: 'viewer',
        invitedBy: 'user-456',
        acceptedByUserId: 'viewer-user'
      });

      mockSend.mockReset()
        .mockResolvedValueOnce({
          Item: {
            id: 'trans-789',
            editors: ['editor-user'],
            viewers: ['viewer-user', 'other-viewer']
          }
        })
        .mockResolvedValueOnce({
          Attributes: {
            id: 'trans-789',
            editors: ['editor-user'],
            viewers: ['other-viewer'],
            dateLastUpdated: expect.any(String)
          }
        });

      const useCase = new RevokeInviteUseCase(validConfig);
      await useCase.execute();

      expect(mockUpdateCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeNames: {
            '#list': 'viewers',
            '#updatedAt': 'dateLastUpdated'
          },
          ExpressionAttributeValues: {
            ':updatedList': ['other-viewer'], // viewer-user removed
            ':updatedAt': expect.any(String)
          }
        })
      );
    });

    it('should use email as fallback when acceptedByUserId is not available', async () => {
      // Setup old invite without acceptedByUserId
      mockInviteService.getInviteById.mockResolvedValue({
        id: 'invite-123',
        email: 'legacy@example.com',
        transcriptionId: 'trans-789',
        status: 'accepted',
        permissionLevel: 'editor',
        invitedBy: 'user-456'
        // No acceptedByUserId field
      });

      mockSend.mockReset()
        .mockResolvedValueOnce({
          Item: {
            id: 'trans-789',
            editors: ['legacy@example.com', 'other-user'],
            viewers: []
          }
        })
        .mockResolvedValueOnce({
          Attributes: {
            id: 'trans-789',
            editors: ['other-user'],
            viewers: [],
            dateLastUpdated: expect.any(String)
          }
        });

      const useCase = new RevokeInviteUseCase(validConfig);
      await useCase.execute();

      expect(mockUpdateCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: {
            ':updatedList': ['other-user'], // legacy@example.com removed
            ':updatedAt': expect.any(String)
          }
        })
      );
    });

    it('should handle transcription not found gracefully', async () => {
      mockSend.mockResolvedValueOnce({ Item: null }); // Transcription not found

      const useCase = new RevokeInviteUseCase(validConfig);
      const result = await useCase.execute();

      // Should still complete successfully
      expect(result.wasAccepted).toBe(true);
      expect(mockInviteService.deleteInvite).toHaveBeenCalledWith('invite-123');
    });

    it('should handle user not in ACL list gracefully', async () => {
      mockSend.mockResolvedValueOnce({
        Item: {
          id: 'trans-789',
          editors: ['different-user'], // user-999 not in list
          viewers: []
        }
      });

      const useCase = new RevokeInviteUseCase(validConfig);
      const result = await useCase.execute();

      // Should not attempt update if user not in list
      expect(mockUpdateCommand).not.toHaveBeenCalled();
      expect(result.wasAccepted).toBe(true);
    });

    it('should throw error when environment variable is missing', async () => {
      delete process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME;

      const useCase = new RevokeInviteUseCase(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow(
        'API_KIYANAW_TRANSCRIPTIONTABLE_NAME environment variable not configured'
      );
    });

    it('should handle DynamoDB errors during ACL cleanup', async () => {
      const dbError = new Error('DynamoDB operation failed');
      mockSend.mockReset().mockRejectedValue(dbError);

      const useCase = new RevokeInviteUseCase(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow('DynamoDB operation failed');
    });

    it('should return correct result for accepted invitation', async () => {
      const useCase = new RevokeInviteUseCase(validConfig);
      const result = await useCase.execute();

      expect(result).toEqual({
        inviteId: 'invite-123',
        email: 'invitee@example.com',
        transcriptionId: 'trans-789',
        wasAccepted: true,
        permissionLevel: 'editor'
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty string inviteId', async () => {
      const config = { ...validConfig, inviteId: '' };
      const useCase = new RevokeInviteUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('Invite ID is required');
    });

    it('should handle empty string requestorUserId', async () => {
      const config = { ...validConfig, requestorUserId: '' };
      const useCase = new RevokeInviteUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('Requestor user ID is required');
    });

    it('should handle delete invite service errors', async () => {
      const deleteError = new Error('Delete operation failed');
      mockInviteService.deleteInvite.mockRejectedValue(deleteError);

      const useCase = new RevokeInviteUseCase(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow('Delete operation failed');
    });

    it('should work with different permission levels', async () => {
      // Test with viewer permission
      mockInviteService.getInviteById.mockResolvedValue({
        id: 'invite-123',
        email: 'viewer@example.com',
        transcriptionId: 'trans-789',
        status: 'pending',
        permissionLevel: 'viewer',
        invitedBy: 'user-456'
      });

      const useCase = new RevokeInviteUseCase(validConfig);
      const result = await useCase.execute();

      expect(result.permissionLevel).toBe('viewer');
    });

    it('should handle various invite statuses', async () => {
      const statuses = ['pending', 'accepted', 'expired'];
      
      for (const status of statuses) {
        // Reset mocks for each iteration
        jest.clearAllMocks();
        mockSend.mockResolvedValue({ Item: null }); // Don't need ACL cleanup for this test
        
        mockInviteService.getInviteById.mockResolvedValue({
          id: 'invite-123',
          email: 'test@example.com',
          transcriptionId: 'trans-789',
          status: status,
          permissionLevel: 'editor',
          invitedBy: 'user-456'
        });

        mockInviteService.deleteInvite.mockResolvedValue();

        const useCase = new RevokeInviteUseCase(validConfig);
        const result = await useCase.execute();

        expect(result.wasAccepted).toBe(status === 'accepted');
      }
    });
  });

  describe('logging and debugging', () => {
    let consoleLogSpy;
    let consoleErrorSpy;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should log revocation process steps', async () => {
      const useCase = new RevokeInviteUseCase(validConfig);
      await useCase.execute();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔄 Revoking invite invite-123 requested by user-456')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Invite invite-123 revoked successfully')
      );
    });

    it('should log authorization failure details', async () => {
      mockInviteService.getInviteById.mockResolvedValue({
        id: 'invite-123',
        email: 'test@example.com',
        transcriptionId: 'trans-789',
        status: 'pending',
        permissionLevel: 'editor',
        invitedBy: 'different-user',
        invitedByFriendly: 'Jane Doe'
      });

      const useCase = new RevokeInviteUseCase(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Authorization failed: different-user !== user-456')
      );
    });
  });
}); 