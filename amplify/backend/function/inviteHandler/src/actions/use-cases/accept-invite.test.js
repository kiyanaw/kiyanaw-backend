const { AcceptInviteUseCase } = require('./accept-invite');

// Mock AWS SDK
const mockSend = jest.fn();
const mockGetCommand = jest.fn();
const mockUpdateCommand = jest.fn();

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

// Mock invite service
jest.mock('../services/invite-service', () => ({
  getInvitesByEmail: jest.fn()
}));

describe('AcceptInviteUseCase', () => {
  let validConfig;
  let mockInvite;
  let mockInviteService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mocked service
    mockInviteService = require('../services/invite-service');
    
    // Reset environment variables
    process.env.REGION = 'us-east-1';
    process.env.API_KIYANAW_INVITETABLE_NAME = 'test-invite-table';
    process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME = 'test-transcription-table';
    
    // Setup valid config
    validConfig = {
      inviteId: 'invite-123',
      userEmail: 'user@example.com',
      userId: 'user-456'
    };

    // Setup mock invite with future expiration date
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    
    mockInvite = {
      id: 'invite-123',
      email: 'user@example.com',
      transcriptionId: 'trans-789',
      status: 'pending',
      permissionLevel: 'editor',
      invitedBy: 'user-999',
      invitedByFriendly: 'John Doe',
      createdAt: '2024-01-01T00:00:00.000Z',
      expiresAt: futureDate.toISOString() // Definitely future date
    };

    // Setup default mock returns
    mockInviteService.getInvitesByEmail.mockResolvedValue([mockInvite]);
  });

  describe('validation', () => {
    it('should throw error when inviteId is missing', async () => {
      const config = { ...validConfig, inviteId: null };
      const useCase = new AcceptInviteUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('Missing required parameter: inviteId');
    });

    it('should throw error when inviteId is empty string', async () => {
      const config = { ...validConfig, inviteId: '' };
      const useCase = new AcceptInviteUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('Missing required parameter: inviteId');
    });

    it('should throw error when inviteId is not a string', async () => {
      const config = { ...validConfig, inviteId: 123 };
      const useCase = new AcceptInviteUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('Missing required parameter: inviteId');
    });

    it('should throw error when userEmail is missing', async () => {
      const config = { ...validConfig, userEmail: null };
      const useCase = new AcceptInviteUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('Missing required parameter: userEmail');
    });

    it('should throw error when userEmail is empty string', async () => {
      const config = { ...validConfig, userEmail: '' };
      const useCase = new AcceptInviteUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('Missing required parameter: userEmail');
    });

    it('should throw error when userId is missing', async () => {
      const config = { ...validConfig, userId: null };
      const useCase = new AcceptInviteUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('Missing required parameter: userId');
    });

    it('should throw error when email format is invalid', async () => {
      const config = { ...validConfig, userEmail: 'invalid-email' };
      const useCase = new AcceptInviteUseCase(config);
      
      await expect(useCase.execute()).rejects.toThrow('Invalid email format');
    });
  });

  describe('findInviteById', () => {
    it('should find invite by ID when it exists', async () => {
      const useCase = new AcceptInviteUseCase(validConfig);
      const result = await useCase.findInviteById('invite-123');

      expect(mockInviteService.getInvitesByEmail).toHaveBeenCalledWith('user@example.com');
      expect(result).toEqual(mockInvite);
    });

    it('should return null when invite is not found', async () => {
      mockInviteService.getInvitesByEmail.mockResolvedValue([]);

      const useCase = new AcceptInviteUseCase(validConfig);
      const result = await useCase.findInviteById('nonexistent-invite');

      expect(result).toBeNull();
    });

    it('should return null when invite service throws error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockInviteService.getInvitesByEmail.mockRejectedValue(new Error('Service error'));

      const useCase = new AcceptInviteUseCase(validConfig);
      const result = await useCase.findInviteById('invite-123');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error finding invite:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    it('should find correct invite when multiple exist', async () => {
      const otherInvite = { ...mockInvite, id: 'invite-456' };
      mockInviteService.getInvitesByEmail.mockResolvedValue([otherInvite, mockInvite]);

      const useCase = new AcceptInviteUseCase(validConfig);
      const result = await useCase.findInviteById('invite-123');

      expect(result).toEqual(mockInvite);
    });
  });

  describe('updateInviteStatus', () => {
    beforeEach(() => {
      mockSend.mockResolvedValue({
        Attributes: {
          ...mockInvite,
          status: 'accepted',
          acceptedAt: '2024-01-15T10:00:00.000Z',
          acceptedByUserId: 'user-456',
          updatedAt: '2024-01-15T10:00:00.000Z'
        }
      });
    });

    it('should update invite status to accepted', async () => {
      const useCase = new AcceptInviteUseCase(validConfig);
      const result = await useCase.updateInviteStatus(mockInvite);

      expect(mockUpdateCommand).toHaveBeenCalledWith({
        TableName: 'test-invite-table',
        Key: { id: 'invite-123' },
        UpdateExpression: 'SET #status = :status, #acceptedAt = :acceptedAt, #acceptedByUserId = :acceptedByUserId, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#acceptedAt': 'acceptedAt',
          '#acceptedByUserId': 'acceptedByUserId',
          '#updatedAt': 'updatedAt'
        },
        ExpressionAttributeValues: {
          ':status': 'accepted',
          ':acceptedAt': expect.any(String),
          ':acceptedByUserId': 'user-456',
          ':updatedAt': expect.any(String)
        },
        ReturnValues: 'ALL_NEW'
      });

      expect(result.status).toBe('accepted');
      expect(result.acceptedByUserId).toBe('user-456');
    });

    it('should throw error when invite table environment variable is missing', async () => {
      delete process.env.API_KIYANAW_INVITETABLE_NAME;

      const useCase = new AcceptInviteUseCase(validConfig);
      
      await expect(useCase.updateInviteStatus(mockInvite)).rejects.toThrow(
        'API_KIYANAW_INVITETABLE_NAME environment variable not configured'
      );
    });

    it('should handle DynamoDB errors', async () => {
      const dbError = new Error('DynamoDB update failed');
      mockSend.mockRejectedValue(dbError);

      const useCase = new AcceptInviteUseCase(validConfig);
      
      await expect(useCase.updateInviteStatus(mockInvite)).rejects.toThrow('DynamoDB update failed');
    });
  });

  describe('addUserToTranscription', () => {
    beforeEach(() => {
      // Mock getting transcription (first call)
      mockSend.mockResolvedValueOnce({
        Item: {
          id: 'trans-789',
          title: 'Test Transcription',
          editors: ['existing-editor'],
          viewers: ['existing-viewer']
        }
      });

      // Mock updating transcription (second call)
      mockSend.mockResolvedValueOnce({
        Attributes: {
          id: 'trans-789',
          title: 'Test Transcription',
          editors: ['existing-editor', 'user-456'],
          viewers: ['existing-viewer'],
          dateLastUpdated: '2024-01-15T10:00:00.000Z'
        }
      });
    });

    it('should add user to editors list', async () => {
      const useCase = new AcceptInviteUseCase(validConfig);
      const result = await useCase.addUserToTranscription('trans-789', 'user-456', 'editor');

      // Should get transcription first
      expect(mockGetCommand).toHaveBeenCalledWith({
        TableName: 'test-transcription-table',
        Key: { id: 'trans-789' }
      });

      // Should update editors list
      expect(mockUpdateCommand).toHaveBeenCalledWith({
        TableName: 'test-transcription-table',
        Key: { id: 'trans-789' },
        UpdateExpression: 'SET #list = list_append(if_not_exists(#list, :empty_list), :user_id), #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#list': 'editors',
          '#updatedAt': 'dateLastUpdated'
        },
        ExpressionAttributeValues: {
          ':user_id': ['user-456'],
          ':empty_list': [],
          ':updatedAt': expect.any(String)
        },
        ReturnValues: 'ALL_NEW'
      });

      expect(result.editors).toContain('user-456');
    });

    it('should add user to viewers list', async () => {
      // Reset mocks for viewer scenario
      mockSend.mockReset()
        .mockResolvedValueOnce({
          Item: {
            id: 'trans-789',
            editors: ['existing-editor'],
            viewers: ['existing-viewer']
          }
        })
        .mockResolvedValueOnce({
          Attributes: {
            id: 'trans-789',
            editors: ['existing-editor'],
            viewers: ['existing-viewer', 'user-456']
          }
        });

      const useCase = new AcceptInviteUseCase(validConfig);
      await useCase.addUserToTranscription('trans-789', 'user-456', 'viewer');

      expect(mockUpdateCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeNames: {
            '#list': 'viewers',
            '#updatedAt': 'dateLastUpdated'
          }
        })
      );
    });

    it('should not update if user is already in the list', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Mock transcription with user already in editors list
      mockSend.mockReset().mockResolvedValueOnce({
        Item: {
          id: 'trans-789',
          editors: ['user-456', 'existing-editor'], // user-456 already exists
          viewers: []
        }
      });

      const useCase = new AcceptInviteUseCase(validConfig);
      const result = await useCase.addUserToTranscription('trans-789', 'user-456', 'editor');

      // Should only call get, not update
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockUpdateCommand).not.toHaveBeenCalled();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'User user-456 is already in transcription trans-789 editors list'
      );

      consoleLogSpy.mockRestore();
    });

    it('should throw error when transcription is not found', async () => {
      mockSend.mockReset().mockResolvedValueOnce({ Item: null });

      const useCase = new AcceptInviteUseCase(validConfig);
      
      await expect(useCase.addUserToTranscription('nonexistent-trans', 'user-456', 'editor'))
        .rejects.toThrow('Transcription nonexistent-trans not found');
    });

    it('should throw error when transcription table environment variable is missing', async () => {
      delete process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME;

      const useCase = new AcceptInviteUseCase(validConfig);
      
      await expect(useCase.addUserToTranscription('trans-789', 'user-456', 'editor'))
        .rejects.toThrow('API_KIYANAW_TRANSCRIPTIONTABLE_NAME environment variable not configured');
    });

    it('should handle DynamoDB errors during transcription update', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const dbError = new Error('DynamoDB error');
      
      mockSend.mockReset()
        .mockResolvedValueOnce({ Item: { id: 'trans-789', editors: [] } })
        .mockRejectedValueOnce(dbError);

      const useCase = new AcceptInviteUseCase(validConfig);
      
      await expect(useCase.addUserToTranscription('trans-789', 'user-456', 'editor'))
        .rejects.toThrow('DynamoDB error');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error adding user user-456 to transcription trans-789:', 
        dbError
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      // Setup successful DynamoDB operations
      mockSend
        // Update invite status
        .mockResolvedValueOnce({
          Attributes: {
            ...mockInvite,
            status: 'accepted',
            acceptedAt: '2024-01-15T10:00:00.000Z',
            acceptedByUserId: 'user-456'
          }
        })
        // Get transcription
        .mockResolvedValueOnce({
          Item: {
            id: 'trans-789',
            editors: ['existing-editor'],
            viewers: []
          }
        })
        // Update transcription
        .mockResolvedValueOnce({
          Attributes: {
            id: 'trans-789',
            editors: ['existing-editor', 'user-456'],
            viewers: []
          }
        });
    });

    it('should successfully accept a valid pending invite', async () => {
      const useCase = new AcceptInviteUseCase(validConfig);
      const result = await useCase.execute();

      expect(result).toEqual({
        inviteId: 'invite-123',
        email: 'user@example.com',
        permissionLevel: 'editor',
        transcriptionId: 'trans-789',
        invitedBy: 'user-999',
        invitedByFriendly: 'John Doe',
        acceptedAt: '2024-01-15T10:00:00.000Z',
        status: 'accepted'
      });
    });

    it('should throw error when invite is not found', async () => {
      mockInviteService.getInvitesByEmail.mockResolvedValue([]);

      const useCase = new AcceptInviteUseCase(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow(
        'Invite not found or you do not have permission to access it'
      );
    });

    it('should throw error when email addresses do not match', async () => {
      const differentEmailInvite = { 
        ...mockInvite, 
        email: 'different@example.com' 
      };
      mockInviteService.getInvitesByEmail.mockResolvedValue([differentEmailInvite]);

      const useCase = new AcceptInviteUseCase(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow(
        'This invite is not for your email address'
      );
    });

    it('should handle case-insensitive email comparison', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const upperCaseEmailInvite = { 
        ...mockInvite, 
        email: 'USER@EXAMPLE.COM',
        expiresAt: futureDate.toISOString()
      };
      mockInviteService.getInvitesByEmail.mockResolvedValue([upperCaseEmailInvite]);

      // Mock DynamoDB to return the uppercase email invite
      mockSend.mockReset()
        .mockResolvedValueOnce({
          Attributes: { ...upperCaseEmailInvite, status: 'accepted', acceptedByUserId: 'user-456' }
        })
        .mockResolvedValueOnce({
          Item: { id: 'trans-789', editors: [], viewers: [] }
        })
        .mockResolvedValueOnce({
          Attributes: { id: 'trans-789', editors: ['user-456'], viewers: [] }
        });

      const useCase = new AcceptInviteUseCase(validConfig);
      const result = await useCase.execute();

      expect(result.email).toBe('USER@EXAMPLE.COM');
    });

    it('should throw error when invite is already accepted', async () => {
      const acceptedInvite = { ...mockInvite, status: 'accepted' };
      mockInviteService.getInvitesByEmail.mockResolvedValue([acceptedInvite]);

      const useCase = new AcceptInviteUseCase(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow(
        'This invitation has already been accepted'
      );
    });

    it('should throw error when invite is expired by status', async () => {
      const expiredInvite = { ...mockInvite, status: 'expired' };
      mockInviteService.getInvitesByEmail.mockResolvedValue([expiredInvite]);

      const useCase = new AcceptInviteUseCase(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow(
        'This invitation has expired'
      );
    });

    it('should throw error when invite has expired by date', async () => {
      const pastExpiredInvite = { 
        ...mockInvite, 
        expiresAt: '2023-01-01T00:00:00.000Z' // Past date
      };
      mockInviteService.getInvitesByEmail.mockResolvedValue([pastExpiredInvite]);

      const useCase = new AcceptInviteUseCase(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow(
        'This invitation has expired'
      );
    });

    it('should throw error for unknown invite status', async () => {
      const unknownStatusInvite = { ...mockInvite, status: 'cancelled' };
      mockInviteService.getInvitesByEmail.mockResolvedValue([unknownStatusInvite]);

      const useCase = new AcceptInviteUseCase(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow(
        'This invitation is no longer valid'
      );
    });

    it('should log successful acceptance', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const useCase = new AcceptInviteUseCase(validConfig);
      await useCase.execute();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Invite accepted successfully: invite-123 for user@example.com, added as editor to transcription trans-789'
      );

      consoleLogSpy.mockRestore();
    });

    it('should work with viewer permission level', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const viewerInvite = { 
        ...mockInvite, 
        permissionLevel: 'viewer',
        expiresAt: futureDate.toISOString()
      };
      mockInviteService.getInvitesByEmail.mockResolvedValue([viewerInvite]);

      // Reset DynamoDB mocks for viewer scenario
      mockSend.mockReset()
        .mockResolvedValueOnce({
          Attributes: { ...viewerInvite, status: 'accepted', acceptedByUserId: 'user-456' }
        })
        .mockResolvedValueOnce({
          Item: { id: 'trans-789', editors: [], viewers: [] }
        })
        .mockResolvedValueOnce({
          Attributes: { id: 'trans-789', editors: [], viewers: ['user-456'] }
        });

      const useCase = new AcceptInviteUseCase(validConfig);
      const result = await useCase.execute();

      expect(result.permissionLevel).toBe('viewer');
    });

    it('should handle service errors during invite update', async () => {
      const updateError = new Error('Invite update failed');
      
      // Setup non-expired invite specifically for this test
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const nonExpiredInvite = { 
        ...mockInvite, 
        expiresAt: futureDate.toISOString()
      };
      mockInviteService.getInvitesByEmail.mockResolvedValue([nonExpiredInvite]);
      
      mockSend.mockReset().mockRejectedValueOnce(updateError);

      const useCase = new AcceptInviteUseCase(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow('Invite update failed');
    });

    it('should handle service errors during transcription update', async () => {
      const transcriptionError = new Error('Transcription update failed');
      
      // Setup non-expired invite specifically for this test
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const nonExpiredInvite = { 
        ...mockInvite, 
        expiresAt: futureDate.toISOString()
      };
      mockInviteService.getInvitesByEmail.mockResolvedValue([nonExpiredInvite]);
      
      mockSend.mockReset()
        .mockResolvedValueOnce({
          Attributes: { ...nonExpiredInvite, status: 'accepted', acceptedByUserId: 'user-456' }
        })
        .mockRejectedValueOnce(transcriptionError);

      const useCase = new AcceptInviteUseCase(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow('Transcription update failed');
    });
  });

  describe('edge cases and integration', () => {
    it('should validate before executing any business logic', async () => {
      const invalidConfig = { ...validConfig, userEmail: 'invalid-email' };
      const useCase = new AcceptInviteUseCase(invalidConfig);

      await expect(useCase.execute()).rejects.toThrow('Invalid email format');
      
      // Should not call any services if validation fails
      expect(mockInviteService.getInvitesByEmail).not.toHaveBeenCalled();
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should handle empty transcription lists gracefully', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const nonExpiredInvite = { 
        ...mockInvite, 
        expiresAt: futureDate.toISOString()
      };
      mockInviteService.getInvitesByEmail.mockResolvedValue([nonExpiredInvite]);
      
      // Mock transcription with empty or missing lists
      mockSend.mockReset()
        .mockResolvedValueOnce({
          Attributes: { ...nonExpiredInvite, status: 'accepted', acceptedByUserId: 'user-456' }
        })
        .mockResolvedValueOnce({
          Item: { id: 'trans-789', title: 'Test' } // No editors/viewers lists
        })
        .mockResolvedValueOnce({
          Attributes: { id: 'trans-789', editors: ['user-456'], viewers: [] }
        });

      const useCase = new AcceptInviteUseCase(validConfig);
      const result = await useCase.execute();

      expect(result.status).toBe('accepted');
    });

    it('should reject email addresses with whitespace', async () => {
      const configWithWhitespace = { 
        ...validConfig, 
        userEmail: '  user@example.com  ' 
      };

      const useCase = new AcceptInviteUseCase(configWithWhitespace);
      
      await expect(useCase.execute()).rejects.toThrow('Invalid email format');
    });
  });
}); 