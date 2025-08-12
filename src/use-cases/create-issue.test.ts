import { CreateIssueUseCase, CreateIssueInput } from './create-issue';
import { createIssueForRegion } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import { rteService } from '../services/rteService';
import type { IssueData } from '../services/adt';

// Mock the dependencies
jest.mock('../services/issueService');
jest.mock('../stores/useEditorStore');
jest.mock('../services/rteService');

const mockCreateIssueForRegion = createIssueForRegion as jest.MockedFunction<typeof createIssueForRegion>;

describe('CreateIssueUseCase', () => {
  let useCase: CreateIssueUseCase;
  let mockEditorStore: any;

  const mockCreatedIssue: IssueData = {
    id: 'new-issue-id',
    text: 'Test issue text',
    type: 'new-word',
    owner: 'user-123',
    ownerFriendly: 'Test User',
    regionId: 'region-456',
    transcriptionId: 'trans-789',
    index: 1,
    resolved: false,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    _version: 1
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    useCase = new CreateIssueUseCase();

    // Mock editor store
    mockEditorStore = {
      addNewIssue: jest.fn(),
      deleteIssue: jest.fn()
    };
    (useEditorStore.getState as jest.Mock).mockReturnValue(mockEditorStore);

    // Mock rteService
    (rteService.updateIssueHighlighting as jest.Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validate', () => {
    it('should throw error for missing text', () => {
      const input = { text: '', type: 'new-word', owner: 'user-123', ownerFriendly: 'Test User', transcriptionId: 'trans-789' };
      expect(() => useCase.validate(input)).toThrow('Issue text is required');
    });

    it('should throw error for whitespace-only text', () => {
      const input = { text: '   ', type: 'new-word', owner: 'user-123', ownerFriendly: 'Test User', transcriptionId: 'trans-789' };
      expect(() => useCase.validate(input)).toThrow('Issue text is required');
    });

    it('should throw error for missing type', () => {
      const input = { text: 'Test issue', type: '', owner: 'user-123', ownerFriendly: 'Test User', transcriptionId: 'trans-789' };
      expect(() => useCase.validate(input)).toThrow('Issue type is required');
    });

    it('should throw error for missing owner', () => {
      const input = { text: 'Test issue', type: 'new-word', owner: '', ownerFriendly: 'Test User', transcriptionId: 'trans-789' };
      expect(() => useCase.validate(input)).toThrow('Issue owner is required');
    });

    it('should throw error for missing ownerFriendly', () => {
      const input = { text: 'Test issue', type: 'new-word', owner: 'user-123', ownerFriendly: '', transcriptionId: 'trans-789' };
      expect(() => useCase.validate(input)).toThrow('Issue owner friendly name is required');
    });

    it('should throw error for missing transcriptionId', () => {
      const input = { text: 'Test issue', type: 'new-word', owner: 'user-123', ownerFriendly: 'Test User', transcriptionId: '' };
      expect(() => useCase.validate(input)).toThrow('Transcription ID is required');
    });

    it('should pass validation for valid input', () => {
      const input = { 
        text: 'Test issue', 
        type: 'new-word', 
        owner: 'user-123', 
        ownerFriendly: 'Test User',
        transcriptionId: 'trans-789' 
      };
      expect(() => useCase.validate(input)).not.toThrow();
    });

    it('should pass validation with optional regionId', () => {
      const input = { 
        text: 'Test issue', 
        type: 'new-word', 
        owner: 'user-123', 
        ownerFriendly: 'Test User',
        regionId: 'region-456',
        transcriptionId: 'trans-789' 
      };
      expect(() => useCase.validate(input)).not.toThrow();
    });
  });

  describe('execute', () => {
    const validInput: CreateIssueInput = {
      text: 'Test issue text',
      type: 'new-word',
      owner: 'user-123',
      ownerFriendly: 'Test User',
      regionId: 'region-456',
      transcriptionId: 'trans-789'
    };

    it('should create an issue successfully', async () => {
      mockCreateIssueForRegion.mockResolvedValue(mockCreatedIssue);

      const result = await useCase.execute(validInput);

      // Verify service call
      expect(mockCreateIssueForRegion).toHaveBeenCalledWith({
        text: 'Test issue text',
        type: 'new-word',
        owner: 'user-123',
        ownerFriendly: 'Test User',
        regionId: 'region-456',
        transcriptionId: 'trans-789'
      });

      // Verify store update
      expect(mockEditorStore.addNewIssue).toHaveBeenCalledWith(mockCreatedIssue);

      // Verify RTE highlighting update
      expect(rteService.updateIssueHighlighting).toHaveBeenCalledWith('region-456');

      // Verify return value
      expect(result).toEqual(mockCreatedIssue);
    });

    it('should handle missing regionId by using empty string', async () => {
      const inputWithoutRegion = { ...validInput, regionId: undefined };
      const issueWithEmptyRegion = { ...mockCreatedIssue, regionId: '' };
      mockCreateIssueForRegion.mockResolvedValue(issueWithEmptyRegion);

      const result = await useCase.execute(inputWithoutRegion);

      expect(mockCreateIssueForRegion).toHaveBeenCalledWith({
        text: 'Test issue text',
        type: 'new-word',
        owner: 'user-123',
        ownerFriendly: 'Test User',
        regionId: '',
        transcriptionId: 'trans-789'
      });

      expect(rteService.updateIssueHighlighting).toHaveBeenCalledWith('');
      expect(result).toEqual(issueWithEmptyRegion);
    });

    it('should trim whitespace from issue text', async () => {
      const inputWithWhitespace = { ...validInput, text: '  Test issue text  ' };
      mockCreateIssueForRegion.mockResolvedValue(mockCreatedIssue);

      await useCase.execute(inputWithWhitespace);

      expect(mockCreateIssueForRegion).toHaveBeenCalledWith({
        text: 'Test issue text',
        type: 'new-word',
        owner: 'user-123',
        ownerFriendly: 'Test User',
        regionId: 'region-456',
        transcriptionId: 'trans-789'
      });
    });

    it('should handle unicode characters correctly', async () => {
      const unicodeInput = { ...validInput, text: 'ē-mânokâkēcik issue' };
      const unicodeIssue = { ...mockCreatedIssue, text: 'ē-mânokâkēcik issue' };
      mockCreateIssueForRegion.mockResolvedValue(unicodeIssue);

      const result = await useCase.execute(unicodeInput);

      expect(mockCreateIssueForRegion).toHaveBeenCalledWith({
        text: 'ē-mânokâkēcik issue',
        type: 'new-word',
        owner: 'user-123',
        ownerFriendly: 'Test User',
        regionId: 'region-456',
        transcriptionId: 'trans-789'
      });

      expect(result).toEqual(unicodeIssue);
    });

    it('should handle different issue types', async () => {
      const needsHelpInput = { ...validInput, type: 'needs-help' };
      const needsHelpIssue = { ...mockCreatedIssue, type: 'needs-help' };
      mockCreateIssueForRegion.mockResolvedValue(needsHelpIssue);

      const result = await useCase.execute(needsHelpInput);

      expect(mockCreateIssueForRegion).toHaveBeenCalledWith({
        text: 'Test issue text',
        type: 'needs-help',
        owner: 'user-123',
        ownerFriendly: 'Test User',
        regionId: 'region-456',
        transcriptionId: 'trans-789'
      });

      expect(result.type).toBe('needs-help');
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Service error');
      mockCreateIssueForRegion.mockRejectedValue(serviceError);

      await expect(useCase.execute(validInput)).rejects.toThrow('Service error');

      expect(console.error).toHaveBeenCalledWith('Failed to create issue:', serviceError);
      // Optimistic update happens before the error, but then gets cleaned up
      expect(mockEditorStore.addNewIssue).toHaveBeenCalledTimes(1);
      expect(mockEditorStore.deleteIssue).toHaveBeenCalledTimes(1);
      expect(rteService.updateIssueHighlighting).toHaveBeenCalledTimes(2); // Once for add, once for cleanup
    });

    it('should handle validation errors', async () => {
      const invalidInput = { ...validInput, text: '' };

      await expect(useCase.execute(invalidInput)).rejects.toThrow('Issue text is required');

      expect(mockCreateIssueForRegion).not.toHaveBeenCalled();
      expect(mockEditorStore.addNewIssue).not.toHaveBeenCalled();
      expect(rteService.updateIssueHighlighting).not.toHaveBeenCalled();
    });

    it('should handle very long text input', async () => {
      const longText = 'A'.repeat(10000);
      const longTextInput = { ...validInput, text: longText };
      const longTextIssue = { ...mockCreatedIssue, text: longText };
      mockCreateIssueForRegion.mockResolvedValue(longTextIssue);

      const result = await useCase.execute(longTextInput);

      expect(mockCreateIssueForRegion).toHaveBeenCalledWith({
        text: longText,
        type: 'new-word',
        owner: 'user-123',
        ownerFriendly: 'Test User',
        regionId: 'region-456',
        transcriptionId: 'trans-789'
      });

      expect(result.text).toBe(longText);
    });

    it('should handle special characters in text', async () => {
      const specialTextInput = { ...validInput, text: 'Text with \n newlines \t and tabs' };
      const specialTextIssue = { ...mockCreatedIssue, text: 'Text with \n newlines \t and tabs' };
      mockCreateIssueForRegion.mockResolvedValue(specialTextIssue);

      const result = await useCase.execute(specialTextInput);

      expect(mockCreateIssueForRegion).toHaveBeenCalledWith({
        text: 'Text with \n newlines \t and tabs',
        type: 'new-word',
        owner: 'user-123',
        ownerFriendly: 'Test User',
        regionId: 'region-456',
        transcriptionId: 'trans-789'
      });

      expect(result.text).toBe('Text with \n newlines \t and tabs');
    });

    it('should handle empty regionId explicitly', async () => {
      const inputWithEmptyRegion = { ...validInput, regionId: '' };
      const issueWithEmptyRegion = { ...mockCreatedIssue, regionId: '' };
      mockCreateIssueForRegion.mockResolvedValue(issueWithEmptyRegion);

      await useCase.execute(inputWithEmptyRegion);

      expect(mockCreateIssueForRegion).toHaveBeenCalledWith({
        text: 'Test issue text',
        type: 'new-word',
        owner: 'user-123',
        ownerFriendly: 'Test User',
        regionId: '',
        transcriptionId: 'trans-789'
      });

      expect(rteService.updateIssueHighlighting).toHaveBeenCalledWith('');
    });
  });
});