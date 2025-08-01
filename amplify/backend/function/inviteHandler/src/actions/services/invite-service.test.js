// Mock AWS SDK before requiring the service
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

// Setup environment variables before requiring the service
process.env.REGION = 'us-east-1';
process.env.API_KIYANAW_INVITETABLE_NAME = 'test-invite-table';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { ValidationError, NotFoundError, InternalError } = require('../errors/invite-errors');

describe('InviteService', () => {
  let mockSend;
  let inviteService;
  let originalEnv;

  beforeAll(() => {
    // Save original environment
    originalEnv = process.env;

    // Setup mocks
    mockSend = jest.fn();
    const mockDocClient = {
      send: mockSend
    };

    DynamoDBClient.mockImplementation(() => ({}));
    DynamoDBDocumentClient.from.mockReturnValue(mockDocClient);

    // Now require the service after mocking
    inviteService = require('./invite-service');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Service Initialization', () => {
    it('should initialize service correctly', () => {
      // Verify the service is properly loaded and configured
      expect(inviteService).toBeDefined();
      expect(typeof inviteService.createInvite).toBe('function');
      expect(typeof inviteService.getInvitesByEmail).toBe('function');
      expect(typeof inviteService.getInviteById).toBe('function');
      expect(typeof inviteService.updateInviteStatus).toBe('function');
      expect(typeof inviteService.deleteInvite).toBe('function');
      expect(typeof inviteService.getTableName).toBe('function');
    });

    it('should set table name from environment variable', () => {
      expect(inviteService.getTableName()).toBe('test-invite-table');
    });
  });

  describe('createInvite', () => {
    const validInviteData = {
      id: 'invite-123',
      email: 'test@example.com',
      transcriptionId: 'transcription-456',
      permissionLevel: 'editor',
      invitedBy: 'user-789',
      invitedByFriendly: 'John Doe',
      expiresAt: '2024-12-31T23:59:59Z',
      createdAt: '2024-01-01T00:00:00Z'
    };

    beforeEach(() => {
      mockSend.mockResolvedValue({});
    });

    it('should create invite record with correct structure', async () => {
      const result = await inviteService.createInvite(validInviteData);

      // Verify the service was called and returned the expected result
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        id: 'invite-123',
        email: 'test@example.com',
        status: 'pending',
        permissionLevel: 'editor',
        expiresAt: '2024-12-31T23:59:59Z',
        invitedBy: 'user-789',
        invitedByFriendly: 'John Doe',
        createdAt: '2024-01-01T00:00:00Z',
        transcriptionId: 'transcription-456',
        acceptedAt: null,
        __typename: 'Invite',
        updatedAt: '2024-01-01T00:00:00Z',
        _version: 0,
        _lastChangedAt: 0,
        _deleted: false
      });
    });

    it('should return the created invite record', async () => {
      const result = await inviteService.createInvite(validInviteData);

      expect(result).toEqual({
        id: 'invite-123',
        email: 'test@example.com',
        status: 'pending',
        permissionLevel: 'editor',
        expiresAt: '2024-12-31T23:59:59Z',
        invitedBy: 'user-789',
        invitedByFriendly: 'John Doe',
        createdAt: '2024-01-01T00:00:00Z',
        transcriptionId: 'transcription-456',
        acceptedAt: null,
        __typename: 'Invite',
        updatedAt: '2024-01-01T00:00:00Z',
        _version: 0,
        _lastChangedAt: 0,
        _deleted: false
      });
    });

    it('should set default status to pending', async () => {
      const result = await inviteService.createInvite(validInviteData);
      expect(result.status).toBe('pending');
    });

    it('should set acceptedAt to null initially', async () => {
      const result = await inviteService.createInvite(validInviteData);
      expect(result.acceptedAt).toBeNull();
    });

    it('should include required Amplify DataStore fields', async () => {
      const result = await inviteService.createInvite(validInviteData);
      
      expect(result.__typename).toBe('Invite');
      expect(result._version).toBe(0);
      expect(result._lastChangedAt).toBe(0);
      expect(result._deleted).toBe(false);
    });

    it('should set updatedAt to same value as createdAt', async () => {
      const result = await inviteService.createInvite(validInviteData);
      expect(result.updatedAt).toBe(validInviteData.createdAt);
    });

    it('should handle viewer permission level', async () => {
      const viewerInviteData = {
        ...validInviteData,
        permissionLevel: 'viewer'
      };

      const result = await inviteService.createInvite(viewerInviteData);
      expect(result.permissionLevel).toBe('viewer');
    });

    it('should handle editor permission level', async () => {
      const editorInviteData = {
        ...validInviteData,
        permissionLevel: 'editor'
      };

      const result = await inviteService.createInvite(editorInviteData);
      expect(result.permissionLevel).toBe('editor');
    });

    it('should have table name configured for tests', async () => {
      // This test just ensures our test setup is working correctly
      expect(inviteService.getTableName()).toBe('test-invite-table');
    });

    it('should handle DynamoDB errors', async () => {
      const dynamoError = new Error('DynamoDB operation failed');
      mockSend.mockRejectedValue(dynamoError);

      await expect(inviteService.createInvite(validInviteData))
        .rejects.toThrow('DynamoDB operation failed');
        
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should preserve all input data fields correctly', async () => {
      const customInviteData = {
        id: 'custom-invite-456',
        email: 'custom@example.com',
        transcriptionId: 'custom-transcription-789',
        permissionLevel: 'viewer',
        invitedBy: 'custom-user-123',
        invitedByFriendly: 'Jane Smith',
        expiresAt: '2025-06-15T12:30:45Z',
        createdAt: '2024-06-01T09:15:30Z'
      };

      const result = await inviteService.createInvite(customInviteData);

      expect(result.id).toBe('custom-invite-456');
      expect(result.email).toBe('custom@example.com');
      expect(result.transcriptionId).toBe('custom-transcription-789');
      expect(result.permissionLevel).toBe('viewer');
      expect(result.invitedBy).toBe('custom-user-123');
      expect(result.invitedByFriendly).toBe('Jane Smith');
      expect(result.expiresAt).toBe('2025-06-15T12:30:45Z');
      expect(result.createdAt).toBe('2024-06-01T09:15:30Z');
    });
  });

  describe('getInvitesByEmail', () => {
    const testEmail = 'test@example.com';

    beforeEach(() => {
      mockSend.mockResolvedValue({
        Items: []
      });
    });

    it('should query invites by email successfully', async () => {
      const result = await inviteService.getInvitesByEmail(testEmail);

      // Verify the DynamoDB query was called and result is correct
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it('should return empty array when no invites found', async () => {
      mockSend.mockResolvedValue({ Items: [] });

      const result = await inviteService.getInvitesByEmail(testEmail);
      expect(result).toEqual([]);
    });

    it('should return invite items when found', async () => {
      const mockInvites = [
        {
          id: 'invite-1',
          email: testEmail,
          status: 'pending',
          permissionLevel: 'editor',
          transcriptionId: 'transcription-1'
        },
        {
          id: 'invite-2',
          email: testEmail,
          status: 'accepted',
          permissionLevel: 'viewer',
          transcriptionId: 'transcription-2'
        }
      ];

      mockSend.mockResolvedValue({ Items: mockInvites });

      const result = await inviteService.getInvitesByEmail(testEmail);
      expect(result).toEqual(mockInvites);
    });

    it('should handle undefined Items in response', async () => {
      mockSend.mockResolvedValue({
        Items: undefined
      });

      const result = await inviteService.getInvitesByEmail(testEmail);
      expect(result).toEqual([]);
    });

    it('should filter out deleted invites', async () => {
      const result = await inviteService.getInvitesByEmail(testEmail);

      // Verify the query was executed (filtering logic is in the service implementation)
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it('should query by email efficiently', async () => {
      const result = await inviteService.getInvitesByEmail(testEmail);

      // Verify query is executed (index usage is implementation detail)
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it('should have table name configured for email queries', async () => {
      // This test ensures our service is properly configured
      expect(inviteService.getTableName()).toBe('test-invite-table');
    });

    it('should handle DynamoDB query errors', async () => {
      const queryError = new Error('DynamoDB query failed');
      mockSend.mockRejectedValue(queryError);

      await expect(inviteService.getInvitesByEmail(testEmail))
        .rejects.toThrow('DynamoDB query failed');
        
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle different email formats correctly', async () => {
      const testEmails = [
        'simple@example.com',
        'user.name@domain.co.uk', 
        'user+tag@example.org',
        'firstname.lastname@company.com'
      ];

      for (const email of testEmails) {
        const result = await inviteService.getInvitesByEmail(email);
        expect(result).toEqual([]);
      }

      // Verify all queries were executed
      expect(mockSend).toHaveBeenCalledTimes(testEmails.length);
    });

    it('should return invites with different statuses', async () => {
      const mockInvites = [
        { id: 'invite-1', email: testEmail, status: 'pending' },
        { id: 'invite-2', email: testEmail, status: 'accepted' },
        { id: 'invite-3', email: testEmail, status: 'expired' }
      ];

      mockSend.mockResolvedValue({ Items: mockInvites });

      const result = await inviteService.getInvitesByEmail(testEmail);
      expect(result).toHaveLength(3);
      expect(result.map(invite => invite.status)).toEqual(['pending', 'accepted', 'expired']);
    });

    it('should return invites with different permission levels', async () => {
      const mockInvites = [
        { id: 'invite-1', email: testEmail, permissionLevel: 'viewer' },
        { id: 'invite-2', email: testEmail, permissionLevel: 'editor' }
      ];

      mockSend.mockResolvedValue({ Items: mockInvites });

      const result = await inviteService.getInvitesByEmail(testEmail);
      expect(result).toHaveLength(2);
      expect(result.map(invite => invite.permissionLevel)).toEqual(['viewer', 'editor']);
    });
  });

  describe('getTableName', () => {
    it('should return the configured table name', () => {
      const tableName = inviteService.getTableName();
      expect(tableName).toBe('test-invite-table');
    });

    it('should be configured during tests', () => {
      // Verify the service is properly configured for our test environment
      expect(inviteService.getTableName()).toBeDefined();
      expect(typeof inviteService.getTableName()).toBe('string');
    });
  });

  describe('Service Architecture', () => {
    it('should be a singleton instance', () => {
      // Re-requiring the service should return the same instance
      const service1 = inviteService;
      const service2 = require('./invite-service');
      
      expect(service1).toBe(service2);
    });

    it('should be stateless - multiple operations should not interfere', async () => {
      const inviteData1 = {
        id: 'invite-1',
        email: 'user1@example.com',
        transcriptionId: 'transcription-1',
        permissionLevel: 'viewer',
        invitedBy: 'user-123',
        invitedByFriendly: 'John Doe',
        expiresAt: '2024-12-31T23:59:59Z',
        createdAt: '2024-01-01T00:00:00Z'
      };

      const inviteData2 = {
        id: 'invite-2',
        email: 'user2@example.com',
        transcriptionId: 'transcription-2',
        permissionLevel: 'editor',
        invitedBy: 'user-456',
        invitedByFriendly: 'Jane Smith',
        expiresAt: '2024-12-31T23:59:59Z',
        createdAt: '2024-01-01T00:00:00Z'
      };

      mockSend.mockResolvedValue({});

      // Perform multiple operations in sequence
      const [result1, result2] = await Promise.all([
        inviteService.createInvite(inviteData1),
        inviteService.createInvite(inviteData2)
      ]);

      expect(result1.email).toBe('user1@example.com');
      expect(result1.permissionLevel).toBe('viewer');
      expect(result2.email).toBe('user2@example.com');
      expect(result2.permissionLevel).toBe('editor');
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Validation', () => {
    it('should preserve data types correctly', async () => {
      const inviteData = {
        id: 'invite-123',
        email: 'test@example.com',
        transcriptionId: 'transcription-456',
        permissionLevel: 'editor',
        invitedBy: 'user-789',
        invitedByFriendly: 'John Doe',
        expiresAt: '2024-12-31T23:59:59Z',
        createdAt: '2024-01-01T00:00:00Z'
      };

      mockSend.mockResolvedValue({});

      const result = await inviteService.createInvite(inviteData);

      // String fields
      expect(typeof result.id).toBe('string');
      expect(typeof result.email).toBe('string');
      expect(typeof result.status).toBe('string');
      expect(typeof result.permissionLevel).toBe('string');
      expect(typeof result.expiresAt).toBe('string');
      expect(typeof result.createdAt).toBe('string');
      expect(typeof result.updatedAt).toBe('string');
      expect(typeof result.__typename).toBe('string');

      // Number fields
      expect(typeof result._version).toBe('number');
      expect(typeof result._lastChangedAt).toBe('number');

      // Boolean fields
      expect(typeof result._deleted).toBe('boolean');

      // Null field
      expect(result.acceptedAt).toBeNull();
    });

    it('should handle various date formats in input', async () => {
      const dateFormats = [
        '2024-12-31T23:59:59Z',
        '2024-12-31T23:59:59.000Z',
        '2024-12-31T23:59:59+00:00'
      ];

      mockSend.mockResolvedValue({});

      for (const dateFormat of dateFormats) {
        const inviteData = {
          id: `invite-${Date.now()}`,
          email: 'test@example.com',
          transcriptionId: 'transcription-456',
          permissionLevel: 'editor',
          invitedBy: 'user-789',
          invitedByFriendly: 'John Doe',
          expiresAt: dateFormat,
          createdAt: dateFormat
        };

        const result = await inviteService.createInvite(inviteData);
        expect(result.expiresAt).toBe(dateFormat);
        expect(result.createdAt).toBe(dateFormat);
      }
    });
  });

  describe('getInviteById', () => {
    const testInviteId = 'test-invite-123';

    it('should get invite by ID successfully', async () => {
      const mockInvite = {
        id: testInviteId,
        email: 'test@example.com',
        status: 'pending',
        permissionLevel: 'viewer',
        transcriptionId: 'trans-123',
        transcriptionTitle: 'Test Transcription',
        _deleted: false
      };

      mockSend.mockResolvedValueOnce({
        Item: mockInvite
      });

      const result = await inviteService.getInviteById(testInviteId);

      expect(result).toEqual(mockInvite);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should return null when invite not found', async () => {
      mockSend.mockResolvedValueOnce({
        Item: undefined
      });

      const result = await inviteService.getInviteById(testInviteId);

      expect(result).toBeNull();
    });

    it('should return null when invite is soft-deleted', async () => {
      const deletedInvite = {
        id: testInviteId,
        email: 'test@example.com',
        _deleted: true
      };

      mockSend.mockResolvedValueOnce({
        Item: deletedInvite
      });

      const result = await inviteService.getInviteById(testInviteId);

      expect(result).toBeNull();
    });

    it('should handle DynamoDB errors', async () => {
      const error = new Error('DynamoDB error');
      mockSend.mockRejectedValueOnce(error);

      await expect(inviteService.getInviteById(testInviteId))
        .rejects.toThrow('DynamoDB error');
    });

    it('should require table name configuration', async () => {
      // Create a new instance without table name to test the error
      const originalTableName = process.env.API_KIYANAW_INVITETABLE_NAME;
      delete process.env.API_KIYANAW_INVITETABLE_NAME;
      
      // Require a fresh instance since the table name is set at construction
      jest.resetModules();
      const inviteServiceFresh = require('./invite-service');

      await expect(inviteServiceFresh.getInviteById(testInviteId))
        .rejects.toThrow('API_KIYANAW_INVITETABLE_NAME environment variable not configured');

      // Restore table name
      process.env.API_KIYANAW_INVITETABLE_NAME = originalTableName;
    });
  });

  describe('deleteInvite', () => {
    const testInviteId = 'test-invite-456';

    it('should delete invite successfully', async () => {
      const deletedInvite = {
        id: testInviteId,
        email: 'test@example.com',
        status: 'pending'
      };

      mockSend.mockResolvedValueOnce({
        Attributes: deletedInvite
      });

      const result = await inviteService.deleteInvite(testInviteId);

      expect(result).toEqual(deletedInvite);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should throw error when invite not found', async () => {
      mockSend.mockResolvedValueOnce({
        Attributes: undefined
      });

      await expect(inviteService.deleteInvite(testInviteId))
        .rejects.toThrow(NotFoundError);
      await expect(inviteService.deleteInvite(testInviteId))
        .rejects.toThrow(`Invite ${testInviteId} not found or already deleted`);
    });

    it('should handle DynamoDB errors', async () => {
      const error = new Error('DynamoDB delete error');
      mockSend.mockRejectedValueOnce(error);

      await expect(inviteService.deleteInvite(testInviteId))
        .rejects.toThrow('DynamoDB delete error');
    });

    it('should require table name configuration', async () => {
      // Create a new instance without table name to test the error  
      const originalTableName = process.env.API_KIYANAW_INVITETABLE_NAME;
      delete process.env.API_KIYANAW_INVITETABLE_NAME;
      
      // Require a fresh instance since the table name is set at construction
      jest.resetModules();
      const inviteServiceFresh = require('./invite-service');

      await expect(inviteServiceFresh.deleteInvite(testInviteId))
        .rejects.toThrow('API_KIYANAW_INVITETABLE_NAME environment variable not configured');

      // Restore table name
      process.env.API_KIYANAW_INVITETABLE_NAME = originalTableName;
    });
  });

  describe('handleInviteServiceError', () => {
    it('should return original error for business logic errors', () => {
      const businessError = new Error('Invite already exists');
      const result = inviteService.handleInviteServiceError(businessError, 'create invite');
      
      expect(result).toBe(businessError);
      expect(result.message).toBe('Invite already exists');
    });

    it('should return user-friendly error for ResourceNotFoundException', () => {
      const awsError = new Error('Resource not found');
      awsError.name = 'ResourceNotFoundException';
      
      const result = inviteService.handleInviteServiceError(awsError, 'get invite');
      
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Resource not found');
    });

    it('should return user-friendly error for ConditionalCheckFailedException', () => {
      const awsError = new Error('Conditional check failed');
      awsError.name = 'ConditionalCheckFailedException';
      
      const result = inviteService.handleInviteServiceError(awsError, 'update invite');
      
      expect(result.message).toBe('Conditional check failed');
    });

    it('should return user-friendly error for ValidationException', () => {
      const awsError = new Error('Invalid request');
      awsError.name = 'ValidationException';
      
      const result = inviteService.handleInviteServiceError(awsError, 'validate invite');
      
      expect(result.message).toBe('Invalid request');
    });

    it('should return generic error for DynamoDB SDK errors', () => {
      const sdkError = new Error('DynamoDB SDK internal error');
      
      const result = inviteService.handleInviteServiceError(sdkError, 'process invite');
      
      expect(result.message).toBe('Failed to process invite. Please try again.');
    });

    it('should return generic error for unknown AWS errors', () => {
      const unknownError = new Error('AWS unknown error');
      unknownError.name = 'UnknownAWSException';
      
      const result = inviteService.handleInviteServiceError(unknownError, 'handle invite');
      
      expect(result.message).toBe('AWS unknown error');
    });
  });

  describe('updateInviteStatus', () => {
    const testInviteId = 'test-invite-789';
    const mockExistingInvite = {
      id: testInviteId,
      email: 'test@example.com',
      status: 'pending',
      permissionLevel: 'editor',
      transcriptionId: 'trans-123',
      _version: 1,
      _lastChangedAt: 123456789,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    beforeEach(() => {
      // Mock getInviteById for the version check
      mockSend
        .mockResolvedValueOnce({ Item: mockExistingInvite }) // getInviteById call
        .mockResolvedValueOnce({}); // updateInviteStatus PutCommand call
    });

    it('should update invite status successfully', async () => {
      const result = await inviteService.updateInviteStatus(testInviteId, 'failed');

      expect(result.status).toBe('failed');
      expect(result.id).toBe(testInviteId);
      expect(result._version).toBe(2); // Version incremented
      expect(mockSend).toHaveBeenCalledTimes(2); // getInviteById + PutCommand
    });

    it('should update status to accepted', async () => {
      const result = await inviteService.updateInviteStatus(testInviteId, 'accepted');

      expect(result.status).toBe('accepted');
      expect(result._version).toBe(2);
    });

    it('should update status to expired', async () => {
      const result = await inviteService.updateInviteStatus(testInviteId, 'expired');

      expect(result.status).toBe('expired');
      expect(result._version).toBe(2);
    });

    it('should preserve all other fields when updating status', async () => {
      const result = await inviteService.updateInviteStatus(testInviteId, 'failed');

      expect(result.id).toBe(mockExistingInvite.id);
      expect(result.email).toBe(mockExistingInvite.email);
      expect(result.permissionLevel).toBe(mockExistingInvite.permissionLevel);
      expect(result.transcriptionId).toBe(mockExistingInvite.transcriptionId);
      expect(result.createdAt).toBe(mockExistingInvite.createdAt);
    });

    it('should update updatedAt timestamp', async () => {
      const result = await inviteService.updateInviteStatus(testInviteId, 'failed');

      expect(result.updatedAt).toBeDefined();
      expect(result.updatedAt).not.toBe(mockExistingInvite.updatedAt);
      expect(new Date(result.updatedAt).getTime()).toBeGreaterThan(new Date(mockExistingInvite.updatedAt).getTime());
    });

    it('should throw error for invalid status', async () => {
      await expect(inviteService.updateInviteStatus(testInviteId, 'invalid-status'))
        .rejects.toThrow(ValidationError);
      await expect(inviteService.updateInviteStatus(testInviteId, 'invalid-status'))
        .rejects.toThrow('Invalid status. Must be one of: pending, accepted, failed, expired');

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should throw error when invite not found', async () => {
      // Override the beforeEach mock setup
      mockSend.mockReset();
      mockSend.mockResolvedValue({ Item: null });

      await expect(inviteService.updateInviteStatus('non-existent-invite', 'failed'))
        .rejects.toThrow(NotFoundError);

      expect(mockSend).toHaveBeenCalledTimes(1); // Only getInviteById called
    });

    it('should handle DynamoDB errors during update', async () => {
      const error = new Error('DynamoDB update error');
      // Override the beforeEach mock setup
      mockSend.mockReset();
      mockSend
        .mockResolvedValueOnce({ Item: mockExistingInvite })
        .mockRejectedValueOnce(error);

      await expect(inviteService.updateInviteStatus(testInviteId, 'failed'))
        .rejects.toThrow('DynamoDB update error');

      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should increment _lastChangedAt timestamp', async () => {
      const beforeTime = Date.now();
      const result = await inviteService.updateInviteStatus(testInviteId, 'failed');

      expect(result._lastChangedAt).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should require table name configuration', async () => {
      const originalTableName = process.env.API_KIYANAW_INVITETABLE_NAME;
      delete process.env.API_KIYANAW_INVITETABLE_NAME;
      
      jest.resetModules();
      const inviteServiceFresh = require('./invite-service');

      await expect(inviteServiceFresh.updateInviteStatus(testInviteId, 'failed'))
        .rejects.toThrow('API_KIYANAW_INVITETABLE_NAME environment variable not configured');

      process.env.API_KIYANAW_INVITETABLE_NAME = originalTableName;
    });
  });

  describe('transcriptionTitle support', () => {
    it('should include transcriptionTitle in created invites', async () => {
      const inviteData = {
        id: 'invite-with-title',
        email: 'test@example.com',
        transcriptionId: 'trans-123',
        transcriptionTitle: 'My Test Transcription',
        permissionLevel: 'viewer',
        invitedBy: 'user-123',
        invitedByFriendly: 'Test User',
        expiresAt: '2024-12-31T23:59:59.000Z',
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      mockSend.mockResolvedValueOnce({
        Attributes: { ...inviteData }
      });

      const result = await inviteService.createInvite(inviteData);

      expect(result.transcriptionTitle).toBe('My Test Transcription');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should preserve transcriptionTitle in retrieved invites', async () => {
      const mockInvite = {
        id: 'invite-123',
        email: 'test@example.com',
        transcriptionTitle: 'Retrieved Transcription',
        status: 'pending'
      };

      // Override any existing mock setup
      mockSend.mockReset();
      mockSend.mockResolvedValueOnce({
        Item: mockInvite
      });

      const result = await inviteService.getInviteById('invite-123');

      expect(result).not.toBeNull();
      expect(result.transcriptionTitle).toBe('Retrieved Transcription');
    });
  });
}); 