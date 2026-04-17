import { 
  loadInvitesForTranscription, 
  sendInvite, 
  deleteInvite,
  revokeInvite,
  __resetClient,
  type CreateInviteData 
} from './inviteService';
import { InviteModel, type InviteData } from './adt';
import { generateClient } from 'aws-amplify/api';
import { post } from 'aws-amplify/api';

// Mock AWS Amplify
jest.mock('aws-amplify/api', () => ({
  generateClient: jest.fn(),
  post: jest.fn()
}));

// Mock GraphQL queries and mutations
jest.mock('../graphql/queries.js', () => ({
  listInvites: 'mockListInvitesQuery',
  getInvite: 'mockGetInviteQuery'
}));

jest.mock('../graphql/mutations.js', () => ({
  deleteInvite: 'mockDeleteInviteMutation',
  updateInvite: 'mockUpdateInviteMutation'
}));

const mockGenerateClient = generateClient as jest.Mock;
const mockPost = post as jest.Mock;

describe('InviteService', () => {
  let mockGraphQLClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetClient(); // Reset the cached client
    
    // Setup mock GraphQL client
    mockGraphQLClient = {
      graphql: jest.fn()
    };
    mockGenerateClient.mockReturnValue(mockGraphQLClient);
  });

  describe('loadInvitesForTranscription', () => {
    const transcriptionId = 'test-transcription-123';

    it('should make GraphQL query with correct parameters', async () => {
      const mockResponse = {
        data: {
          listInvites: {
            items: []
          }
        }
      };

      mockGraphQLClient.graphql.mockResolvedValue(mockResponse);

      await loadInvitesForTranscription(transcriptionId);

      expect(mockGraphQLClient.graphql).toHaveBeenCalledWith({
        query: 'mockListInvitesQuery',
        variables: {
          filter: {
            transcriptionId: { eq: transcriptionId },
            _deleted: { ne: true }
          },
          limit: 1000
        }
      });
    });

    it('should process valid invite data correctly', async () => {
      const mockInviteData: InviteData = {
        id: 'invite-123',
        email: 'test@example.com',
        status: 'pending',
        permissionLevel: 'editor',
        expiresAt: '2024-12-31T23:59:59Z',
        invitedBy: 'user-123',
        invitedByFriendly: 'John Doe',
        createdAt: '2024-01-01T00:00:00Z',
        transcriptionId: transcriptionId,
        transcriptionTitle: 'Test Transcription',
        acceptedAt: undefined,
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const mockResponse = {
        data: {
          listInvites: {
            items: [mockInviteData]
          }
        }
      };

      mockGraphQLClient.graphql.mockResolvedValue(mockResponse);

      const result = await loadInvitesForTranscription(transcriptionId);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(InviteModel);
      expect(result[0].email).toBe('test@example.com');
      expect(result[0].status).toBe('pending');
      expect(result[0].permissionLevel).toBe('editor');
    });

    it('should filter out invites with missing required fields', async () => {
      const validInvite: InviteData = {
        id: 'invite-123',
        email: 'valid@example.com',
        status: 'pending',
        permissionLevel: 'editor',
        expiresAt: '2024-12-31T23:59:59Z',
        invitedBy: 'user-123',
        invitedByFriendly: 'John Doe',
        createdAt: '2024-01-01T00:00:00Z',
        transcriptionId: transcriptionId,
        transcriptionTitle: 'Test Transcription',
        acceptedAt: undefined,
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const invalidInvites = [
        null, // Null invite
        { ...validInvite, id: null }, // Missing ID
        { ...validInvite, email: null }, // Missing email
        { ...validInvite, status: null }, // Missing status
        { ...validInvite, permissionLevel: null }, // Missing permission level
        { ...validInvite, transcriptionId: 'different-id' }, // Wrong transcription ID
      ];

      const mockResponse = {
        data: {
          listInvites: {
            items: [validInvite, ...invalidInvites]
          }
        }
      };

      mockGraphQLClient.graphql.mockResolvedValue(mockResponse);

      const result = await loadInvitesForTranscription(transcriptionId);

      // Should only return the valid invite
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('valid@example.com');
    });

         it('should handle invites with missing metadata fields gracefully', async () => {
       const inviteWithMissingMetadata = {
         id: 'invite-123',
         email: 'test@example.com',
         status: 'pending',
         permissionLevel: 'editor',
         expiresAt: '2024-12-31T23:59:59Z',
         invitedBy: 'user-123',
         invitedByFriendly: 'John Doe',
         createdAt: '2024-01-01T00:00:00Z',
         transcriptionId: transcriptionId,
         // Missing _version, _deleted, _lastChangedAt
         _version: null,
         _deleted: null,
         _lastChangedAt: null
       };

       const mockResponse = {
         data: {
           listInvites: {
             items: [inviteWithMissingMetadata]
           }
         }
       };

       mockGraphQLClient.graphql.mockResolvedValue(mockResponse);

       const result = await loadInvitesForTranscription(transcriptionId);

       // Should successfully process the invite despite missing metadata
       expect(result).toHaveLength(1);
       expect(result[0].email).toBe('test@example.com');
       expect(result[0].status).toBe('pending');
       expect(result[0].permissionLevel).toBe('editor');
     });

    it('should throw error when no data can be recovered', async () => {
      const pureError = new Error('Network error');
      mockGraphQLClient.graphql.mockRejectedValue(pureError);

      await expect(loadInvitesForTranscription(transcriptionId))
        .rejects.toThrow('Network error');
    });

    it('should handle empty response correctly', async () => {
      const mockResponse = {
        data: {
          listInvites: {
            items: []
          }
        }
      };

      mockGraphQLClient.graphql.mockResolvedValue(mockResponse);

      const result = await loadInvitesForTranscription(transcriptionId);

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should log GraphQL errors but continue with available data', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const validInvite = {
        id: 'invite-123',
        email: 'test@example.com',
        status: 'pending',
        permissionLevel: 'editor',
        expiresAt: '2024-12-31T23:59:59Z',
        invitedBy: 'user-123',
        invitedByFriendly: 'John Doe',
        createdAt: '2024-01-01T00:00:00Z',
        transcriptionId: transcriptionId
      };

      const responseWithErrors = {
        data: {
          listInvites: {
            items: [validInvite]
          }
        },
        errors: [
          { message: 'Some GraphQL error' }
        ]
      };

      mockGraphQLClient.graphql.mockResolvedValue(responseWithErrors);

      const result = await loadInvitesForTranscription(transcriptionId);

      expect(result).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('GraphQL errors encountered'),
        expect.arrayContaining([{ message: 'Some GraphQL error' }])
      );

      consoleSpy.mockRestore();
    });
  });

  describe('sendInvite', () => {
    const validInviteData: CreateInviteData = {
      email: 'test@example.com',
      permissionLevel: 'editor',
      transcriptionId: 'transcription-123',
      transcriptionTitle: 'Test Transcription',
      invitedBy: 'user-123',
      invitedByFriendly: 'John Doe'
    };

    beforeEach(() => {
      // Setup default successful response
      const mockResponse = {
        body: {
          json: jest.fn().mockResolvedValue({
            success: true,
            messageId: 'test-message-123',
            inviteId: 'invite-456'
          })
        }
      };

      mockPost.mockReturnValue({ response: Promise.resolve(mockResponse) } as any);
    });

    it('should make API call with correct parameters', async () => {
      await sendInvite(validInviteData);

      expect(mockPost).toHaveBeenCalledWith({
        apiName: 'invite',
        path: '/invite',
        options: {
          body: validInviteData
        }
      });
    });

    it('should return messageId and inviteId on success', async () => {
      const result = await sendInvite(validInviteData);

      expect(result).toEqual({
        messageId: 'test-message-123',
        inviteId: 'invite-456'
      });
    });

    it('should handle missing messageId or inviteId gracefully', async () => {
      const mockResponse = {
        body: {
          json: jest.fn().mockResolvedValue({
            success: true
            // Missing messageId and inviteId
          })
        }
      };

      mockPost.mockReturnValue({ response: Promise.resolve(mockResponse) } as any);

      const result = await sendInvite(validInviteData);

      expect(result).toEqual({
        messageId: '',
        inviteId: ''
      });
    });

    it('should throw specific error when backend returns error', async () => {
      const mockResponse = {
        body: {
          json: jest.fn().mockResolvedValue({
            success: false,
            error: 'Invite already exists for this email and transcription'
          })
        }
      };

      mockPost.mockReturnValue({ response: Promise.resolve(mockResponse) } as any);

      await expect(sendInvite(validInviteData))
        .rejects.toThrow('Invite already exists for this email and transcription');
    });

    it('should handle HTTP error responses with parsed error messages', async () => {
      const errorResponse = {
        response: {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Invalid email format'
          })
        }
      };

      mockPost.mockReturnValue({ 
        response: Promise.reject(errorResponse)
      } as any);

      await expect(sendInvite(validInviteData))
        .rejects.toThrow('Invalid email format');
    });

    it('should handle HTTP error responses with string body', async () => {
      const errorResponse = {
        response: {
          statusCode: 500,
          body: '{"error": "Internal server error"}'
        }
      };

      mockPost.mockReturnValue({ 
        response: Promise.reject(errorResponse)
      } as any);

      await expect(sendInvite(validInviteData))
        .rejects.toThrow('Internal server error');
    });

    it('should handle unparseable error response body', async () => {
      const errorResponse = {
        response: {
          statusCode: 500,
          body: 'Invalid JSON'
        }
      };

      mockPost.mockReturnValue({ 
        response: Promise.reject(errorResponse)
      } as any);

      await expect(sendInvite(validInviteData))
        .rejects.toThrow('Failed to send invite. Please try again.');
    });

    it('should handle AWS Amplify specific errors', async () => {
      const amplifyError = {
        message: 'Network connection failed'
      };

      mockPost.mockReturnValue({ 
        response: Promise.reject(amplifyError)
      } as any);

      await expect(sendInvite(validInviteData))
        .rejects.toThrow('Network connection failed');
    });

    it('should handle errors with error property', async () => {
      const errorWithProperty = {
        error: 'Authentication failed'
      };

      mockPost.mockReturnValue({ 
        response: Promise.reject(errorWithProperty)
      } as any);

      await expect(sendInvite(validInviteData))
        .rejects.toThrow('Authentication failed');
    });

    it('should provide fallback error message for unknown errors', async () => {
      const unknownError = {
        someProperty: 'unknown structure'
      };

      mockPost.mockReturnValue({ 
        response: Promise.reject(unknownError)
      } as any);

      await expect(sendInvite(validInviteData))
        .rejects.toThrow('Failed to send invite. Please try again.');
    });

    it('should not throw for "Unknown error" messages', async () => {
      const unknownErrorMessage = {
        message: 'Unknown error'
      };

      mockPost.mockReturnValue({ 
        response: Promise.reject(unknownErrorMessage)
      } as any);

      await expect(sendInvite(validInviteData))
        .rejects.toThrow('Failed to send invite. Please try again.');
    });
  });

  describe('deleteInvite', () => {
    const inviteId = 'invite-123';

    it('should make GraphQL mutation with correct parameters', async () => {
      const mockResponse = {
        data: {
          deleteInvite: {
            id: inviteId,
            email: 'test@example.com'
          }
        }
      };

      mockGraphQLClient.graphql.mockResolvedValue(mockResponse);

      await deleteInvite(inviteId);

      expect(mockGraphQLClient.graphql).toHaveBeenCalledWith({
        query: 'mockDeleteInviteMutation',
        variables: { input: { id: inviteId } },
        authMode: 'userPool'
      });
    });

    it('should complete successfully when invite is deleted', async () => {
      const mockResponse = {
        data: {
          deleteInvite: {
            id: inviteId,
            email: 'test@example.com'
          }
        }
      };

      mockGraphQLClient.graphql.mockResolvedValue(mockResponse);

      // Should not throw
      await expect(deleteInvite(inviteId)).resolves.toBeUndefined();
    });

    it('should throw error when no data is returned', async () => {
      const mockResponse = {
        data: {
          deleteInvite: null
        }
      };

      mockGraphQLClient.graphql.mockResolvedValue(mockResponse);

      await expect(deleteInvite(inviteId))
        .rejects.toThrow('Failed to delete invite - no data returned');
    });

    it('should throw error when deletion fails', async () => {
      const graphqlError = new Error('Invite not found');
      mockGraphQLClient.graphql.mockRejectedValue(graphqlError);

      await expect(deleteInvite(inviteId))
        .rejects.toThrow('Invite not found');
    });

    it('should handle undefined response data', async () => {
      const mockResponse = {
        data: undefined
      };

      mockGraphQLClient.graphql.mockResolvedValue(mockResponse);

      await expect(deleteInvite(inviteId))
        .rejects.toThrow('Failed to delete invite - no data returned');
    });
  });

  describe('revokeInvite', () => {
    const inviteId = 'invite-123';
    const requestorUserId = 'user-456';

    beforeEach(() => {
      // Setup default successful response
      const mockResponse = {
        body: {
          json: jest.fn().mockResolvedValue({
            success: true,
            message: 'Invitation revoked successfully',
            inviteId: inviteId,
            email: 'test@example.com',
            transcriptionId: 'transcription-789',
            wasAccepted: true,
            permissionLevel: 'viewer'
          })
        }
      };

      mockPost.mockReturnValue({ response: Promise.resolve(mockResponse) } as any);
    });

    it('should make API call with correct parameters', async () => {
      await revokeInvite(inviteId, requestorUserId);

      expect(mockPost).toHaveBeenCalledWith({
        apiName: 'invite',
        path: '/invite/revoke',
        options: {
          body: {
            inviteId,
            requestorUserId
          }
        }
      });
    });

    it('should return revocation details on success', async () => {
      const result = await revokeInvite(inviteId, requestorUserId);

      expect(result).toEqual({
        message: 'Invitation revoked successfully',
        inviteId: inviteId,
        email: 'test@example.com',
        transcriptionId: 'transcription-789',
        wasAccepted: true,
        permissionLevel: 'viewer'
      });
    });

    it('should handle missing optional fields gracefully', async () => {
      const mockResponse = {
        body: {
          json: jest.fn().mockResolvedValue({
            success: true,
            inviteId: inviteId,
            email: 'test@example.com',
            transcriptionId: 'transcription-789',
            wasAccepted: false,
            permissionLevel: 'editor'
            // Missing message
          })
        }
      };

      mockPost.mockReturnValue({ response: Promise.resolve(mockResponse) } as any);

      const result = await revokeInvite(inviteId, requestorUserId);

      expect(result).toEqual({
        message: 'Invitation revoked successfully',
        inviteId: inviteId,
        email: 'test@example.com',
        transcriptionId: 'transcription-789',
        wasAccepted: false,
        permissionLevel: 'editor'
      });
    });

    it('should throw specific error when backend returns error', async () => {
      const mockResponse = {
        body: {
          json: jest.fn().mockResolvedValue({
            success: false,
            error: 'Unauthorized: Only the person who sent the invite can revoke it'
          })
        }
      };

      mockPost.mockReturnValue({ response: Promise.resolve(mockResponse) } as any);

      await expect(revokeInvite(inviteId, requestorUserId))
        .rejects.toThrow('Unauthorized: Only the person who sent the invite can revoke it');
    });

    it('should handle HTTP 400 error responses with parsed error messages', async () => {
      const errorResponse = {
        response: {
          statusCode: 400,
          body: {
            json: jest.fn().mockResolvedValue({
              error: 'Invalid invite ID format'
            })
          }
        }
      };

      mockPost.mockReturnValue({ 
        response: Promise.reject(errorResponse)
      } as any);

      await expect(revokeInvite(inviteId, requestorUserId))
        .rejects.toThrow('Failed to revoke invite. Please try again.');
    });

    it('should handle generic HTTP error responses', async () => {
      const errorResponse = {
        response: {
          statusCode: 500
        }
      };

      mockPost.mockReturnValue({ 
        response: Promise.reject(errorResponse)
      } as any);

      await expect(revokeInvite(inviteId, requestorUserId))
        .rejects.toThrow('Failed to revoke invite. Please try again.');
    });

    it('should handle AWS Amplify specific errors', async () => {
      const amplifyError = {
        message: 'Request timeout'
      };

      mockPost.mockReturnValue({ 
        response: Promise.reject(amplifyError)
      } as any);

      await expect(revokeInvite(inviteId, requestorUserId))
        .rejects.toThrow('Request timeout');
    });

    it('should provide fallback error message for unknown errors', async () => {
      const unknownError = {
        someProperty: 'unknown structure'
      };

      mockPost.mockReturnValue({ 
        response: Promise.reject(unknownError)
      } as any);

      await expect(revokeInvite(inviteId, requestorUserId))
        .rejects.toThrow('Failed to revoke invite. Please try again.');
    });

    it('should handle invite that was not accepted (pending status)', async () => {
      const mockResponse = {
        body: {
          json: jest.fn().mockResolvedValue({
            success: true,
            message: 'Invitation revoked successfully',
            inviteId: inviteId,
            email: 'test@example.com',
            transcriptionId: 'transcription-789',
            wasAccepted: false,
            permissionLevel: 'editor'
          })
        }
      };

      mockPost.mockReturnValue({ response: Promise.resolve(mockResponse) } as any);

      const result = await revokeInvite(inviteId, requestorUserId);

      expect(result.wasAccepted).toBe(false);
      expect(result.message).toBe('Invitation revoked successfully');
    });

    it('should handle different permission levels', async () => {
      const testCases = [
        { permissionLevel: 'viewer' as const },
        { permissionLevel: 'editor' as const }
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          body: {
            json: jest.fn().mockResolvedValue({
              success: true,
              message: 'Invitation revoked successfully',
              inviteId: inviteId,
              email: 'test@example.com',
              transcriptionId: 'transcription-789',
              wasAccepted: true,
              permissionLevel: testCase.permissionLevel
            })
          }
        };

        mockPost.mockReturnValue({ response: Promise.resolve(mockResponse) } as any);

        const result = await revokeInvite(inviteId, requestorUserId);
        expect(result.permissionLevel).toBe(testCase.permissionLevel);
      }
    });
  });

  describe('Client Management', () => {
    it('should reuse the same client instance across calls', async () => {
      const mockResponse = {
        data: {
          listInvites: {
            items: []
          }
        }
      };

      mockGraphQLClient.graphql.mockResolvedValue(mockResponse);

      // Make multiple calls
      await loadInvitesForTranscription('transcription-1');
      await loadInvitesForTranscription('transcription-2');

      // Should only create client once
      expect(mockGenerateClient).toHaveBeenCalledTimes(1);
    });

    it('should create new client after reset', async () => {
      const mockResponse = {
        data: {
          listInvites: {
            items: []
          }
        }
      };

      mockGraphQLClient.graphql.mockResolvedValue(mockResponse);

      // First call
      await loadInvitesForTranscription('transcription-1');
      expect(mockGenerateClient).toHaveBeenCalledTimes(1);

      // Reset and call again
      __resetClient();
      await loadInvitesForTranscription('transcription-2');
      expect(mockGenerateClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Transformation', () => {
    it('should preserve all invite data fields correctly', async () => {
      const completeInviteData = {
        id: 'invite-123',
        email: 'test@example.com',
        status: 'accepted',
        permissionLevel: 'viewer' as const,
        expiresAt: '2024-12-31T23:59:59Z',
        invitedBy: 'user-123',
        invitedByFriendly: 'Jane Smith',
        createdAt: '2024-01-01T00:00:00Z',
        acceptedAt: '2024-01-15T10:30:00Z',
        transcriptionId: 'transcription-456',
        transcriptionTitle: 'Complete Test Transcription',
        updatedAt: '2024-01-15T10:30:00Z',
        _version: 2,
        _deleted: false,
        _lastChangedAt: 1642233000000
      };

      const mockResponse = {
        data: {
          listInvites: {
            items: [completeInviteData]
          }
        }
      };

      mockGraphQLClient.graphql.mockResolvedValue(mockResponse);

      const result = await loadInvitesForTranscription('transcription-456');

      expect(result).toHaveLength(1);
      const invite = result[0];
      
      expect(invite.id).toBe('invite-123');
      expect(invite.email).toBe('test@example.com');
      expect(invite.status).toBe('accepted');
      expect(invite.permissionLevel).toBe('viewer');
      expect(invite.expiresAt).toBe('2024-12-31T23:59:59Z');
      expect(invite.invitedBy).toBe('user-123');
      expect(invite.invitedByFriendly).toBe('Jane Smith');
      expect(invite.createdAt).toBe('2024-01-01T00:00:00Z');
      expect(invite.acceptedAt).toBe('2024-01-15T10:30:00Z');
      expect(invite.transcriptionId).toBe('transcription-456');
      expect(invite.updatedAt).toBe('2024-01-15T10:30:00Z');
    });

    it('should handle different permission levels correctly', async () => {
      const editorInvite = {
        id: 'invite-1',
        email: 'editor@example.com',
        status: 'pending',
        permissionLevel: 'editor',
        expiresAt: '2024-12-31T23:59:59Z',
        invitedBy: 'user-123',
        invitedByFriendly: 'John Doe',
        createdAt: '2024-01-01T00:00:00Z',
        transcriptionId: 'transcription-123',
        transcriptionTitle: 'Editor Test Transcription'
      };

      const viewerInvite = {
        id: 'invite-2',
        email: 'viewer@example.com',
        status: 'pending',
        permissionLevel: 'viewer',
        expiresAt: '2024-12-31T23:59:59Z',
        invitedBy: 'user-123',
        invitedByFriendly: 'John Doe',
        createdAt: '2024-01-01T00:00:00Z',
        transcriptionId: 'transcription-123',
        transcriptionTitle: 'Viewer Test Transcription'
      };

      const mockResponse = {
        data: {
          listInvites: {
            items: [editorInvite, viewerInvite]
          }
        }
      };

      mockGraphQLClient.graphql.mockResolvedValue(mockResponse);

      const result = await loadInvitesForTranscription('transcription-123');

      expect(result).toHaveLength(2);
      expect(result.find(i => i.email === 'editor@example.com')?.permissionLevel).toBe('editor');
      expect(result.find(i => i.email === 'viewer@example.com')?.permissionLevel).toBe('viewer');
    });
  });
}); 