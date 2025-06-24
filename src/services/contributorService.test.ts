import { contributorService } from './contributorService';
import { DataStore } from '@aws-amplify/datastore';
import { Contributor } from '../models';

// Mock DataStore
jest.mock('@aws-amplify/datastore', () => ({
  DataStore: {
    query: jest.fn(),
    save: jest.fn()
  }
}));

// Mock models
jest.mock('../models', () => ({
  Contributor: function(data: any) { return { ...data, id: 'contributor-id' }; },
  TranscriptionContributor: function(data: any) { return { ...data, id: 'link-id' }; },
  Transcription: function(data: any) { return { ...data, id: 'transcription-id' }; }
}));

const mockModels = {
  Contributor: jest.fn(),
  TranscriptionContributor: jest.fn(), 
  Transcription: jest.fn()
};

const mockDataStore = DataStore as jest.Mocked<typeof DataStore>;

describe('ContributorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUsername', () => {
    it('should find contributor by username', async () => {
      const mockContributor = { username: 'testuser', email: 'test@example.com' };
      mockDataStore.query.mockResolvedValue(mockContributor as any);

      const result = await contributorService.findByUsername('testuser');

      expect(DataStore.query).toHaveBeenCalledWith(Contributor, 'testuser');
      expect(result).toBe(mockContributor);
    });

    it('should return undefined when contributor not found', async () => {
      mockDataStore.query.mockResolvedValue(undefined as any);

      const result = await contributorService.findByUsername('nonexistent');

      expect(DataStore.query).toHaveBeenCalledWith(Contributor, 'nonexistent');
      expect(result).toBeUndefined();
    });

    it('should propagate DataStore errors', async () => {
      const error = new Error('DataStore query failed');
      mockDataStore.query.mockRejectedValue(error);

      await expect(contributorService.findByUsername('testuser')).rejects.toThrow('DataStore query failed');
    });
  });

  describe('create', () => {
    it('should create new contributor', async () => {
      const mockSavedContributor = { 
        username: 'newuser', 
        email: 'new@example.com',
        id: 'contributor-id'
      };
      mockDataStore.save.mockResolvedValue(mockSavedContributor as any);

      const result = await contributorService.create('newuser', 'new@example.com');

      expect(DataStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'newuser',
          email: 'new@example.com'
        })
      );
      expect(result).toBe(mockSavedContributor);
    });

    it('should propagate DataStore save errors', async () => {
      const error = new Error('Save failed');
      mockDataStore.save.mockRejectedValue(error);

      await expect(contributorService.create('user', 'email@test.com')).rejects.toThrow('Save failed');
    });
  });

  describe('findOrCreate', () => {
    it('should return existing contributor when found', async () => {
      const existingContributor = { username: 'existing', email: 'existing@example.com' };
      mockDataStore.query.mockResolvedValue(existingContributor as any);

      const result = await contributorService.findOrCreate('existing', 'existing@example.com');

      expect(DataStore.query).toHaveBeenCalledWith(Contributor, 'existing');
      expect(DataStore.save).not.toHaveBeenCalled();
      expect(result).toBe(existingContributor);
    });

    it('should create new contributor when not found', async () => {
      const newContributor = { username: 'newuser', email: 'new@example.com', id: 'new-id' };
      mockDataStore.query.mockResolvedValue(undefined as any);
      mockDataStore.save.mockResolvedValue(newContributor as any);

      const result = await contributorService.findOrCreate('newuser', 'new@example.com');

      expect(DataStore.query).toHaveBeenCalledWith(Contributor, 'newuser');
      expect(DataStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'newuser',
          email: 'new@example.com'
        })
      );
      expect(result).toBe(newContributor);
    });

    it('should handle different email for existing user', async () => {
      const existingContributor = { username: 'user', email: 'old@example.com' };
      mockDataStore.query.mockResolvedValue(existingContributor as any);

      const result = await contributorService.findOrCreate('user', 'new@example.com');

      // Should return existing contributor regardless of email provided
      expect(result).toBe(existingContributor);
      expect(DataStore.save).not.toHaveBeenCalled();
    });
  });

  describe('linkToTranscription', () => {
    it('should create transcription-contributor link', async () => {
      const mockContributor = { id: 'contributor-id', username: 'user' };
      const mockTranscription = { id: 'transcription-id', title: 'Test Transcription' };
      const mockLink = { 
        id: 'link-id', 
        contributor: mockContributor, 
        transcription: mockTranscription 
      };
      
      mockDataStore.save.mockResolvedValue(mockLink as any);

      const result = await contributorService.linkToTranscription(
        mockContributor as any,
        mockTranscription as any
      );

      expect(DataStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          contributor: mockContributor,
          transcription: mockTranscription
        })
      );
      expect(result).toBe(mockLink);
    });

    it('should propagate link creation errors', async () => {
      const error = new Error('Link creation failed');
      mockDataStore.save.mockRejectedValue(error);

      const mockContributor = { id: 'contributor-id' };
      const mockTranscription = { id: 'transcription-id' };

      await expect(
        contributorService.linkToTranscription(mockContributor as any, mockTranscription as any)
      ).rejects.toThrow('Link creation failed');
    });
  });

  describe('Service Architecture Compliance', () => {
    it('should be stateless - multiple operations should not interfere', async () => {
      const contributor1 = { username: 'user1', email: 'user1@test.com' };
      const contributor2 = { username: 'user2', email: 'user2@test.com' };
      
      mockDataStore.query
        .mockResolvedValueOnce(contributor1 as any)
        .mockResolvedValueOnce(undefined as any);
      mockDataStore.save.mockResolvedValue(contributor2 as any);

      const [result1, result2] = await Promise.all([
        contributorService.findByUsername('user1'),
        contributorService.findOrCreate('user2', 'user2@test.com')
      ]);

      expect(result1).toBe(contributor1);
      expect(result2).toBe(contributor2);
      expect(DataStore.query).toHaveBeenCalledTimes(2);
    });

    it('should not mutate input objects', async () => {
      const originalContributor = { id: 'original-id', username: 'original' };
      const originalTranscription = { id: 'original-transcription-id', title: 'Original' };
      
      mockDataStore.save.mockResolvedValue({} as any);

      await contributorService.linkToTranscription(
        originalContributor as any,
        originalTranscription as any
      );

      expect(originalContributor.id).toBe('original-id');
      expect(originalTranscription.id).toBe('original-transcription-id');
    });
  });
}); 