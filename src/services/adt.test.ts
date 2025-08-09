import { TranscriptionModel, RegionModel, InviteModel } from './adt';
import type { TranscriptionData, RegionData, InviteData } from './adt';

describe('ADT Models', () => {
  describe('TranscriptionModel', () => {
    const mockTranscriptionData: TranscriptionData = {
      id: 'test-transcription-id',
      title: 'Test Transcription',
      comments: 'Test comments',
      author: 'test-author',
      authorFriendly: 'Test Author',
      type: 'audio/mp3',
      issues: 5,
      source: 'test-source.mp3',
      coverage: 85.5,
      isPrivate: true,
      disableAnalyzer: false,
      dateLastUpdated: '2023-01-01T00:00:00Z',
      userLastUpdated: 'test-user',
      length: 123.45,
      lang: 'crk',
    };

    beforeEach(() => {
      jest.clearAllMocks();
      // Mock console.warn to avoid output during tests
      jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('constructor', () => {
      it('should have correct constructor signature', () => {
        expect(typeof TranscriptionModel).toBe('function');
        expect(TranscriptionModel.length).toBe(1); // Should accept 1 parameter
      });

      it('should map all basic properties correctly', () => {
        const model = new TranscriptionModel(mockTranscriptionData);

        expect(model.id).toBe(mockTranscriptionData.id);
        expect(model.title).toBe(mockTranscriptionData.title);
        expect(model.comments).toBe(mockTranscriptionData.comments);
        expect(model.author).toBe(mockTranscriptionData.author);
        expect(model.type).toBe(mockTranscriptionData.type);
        expect(model.source).toBe(mockTranscriptionData.source);
        expect(model.coverage).toBe(mockTranscriptionData.coverage);
        expect(model.isPrivate).toBe(mockTranscriptionData.isPrivate);
        expect(model.disableAnalyzer).toBe(mockTranscriptionData.disableAnalyzer);
        expect(model.dateLastUpdated).toBe(mockTranscriptionData.dateLastUpdated);
        expect(model.userLastUpdated).toBe(mockTranscriptionData.userLastUpdated);
        expect(model.lang).toBe(mockTranscriptionData.lang);
      });

      it('should store original data reference', () => {
        const model = new TranscriptionModel(mockTranscriptionData);
        expect(model.data).toBe(mockTranscriptionData);
      });

      it('should set default values for optional properties', () => {
        const minimalData: TranscriptionData = {
          id: 'test-id',
          title: 'Test Title',
          author: 'Test Author',
          authorFriendly: 'Test Author',
          type: 'audio/mp3',
          source: 'test.mp3',
          length: 60,
        };

        const model = new TranscriptionModel(minimalData);

        expect(model.coverage).toBe(0);
        expect(model.isPrivate).toBe(false);
        expect(model.disableAnalyzer).toBe(false);
      });

      it('should handle disableAnalyzer boolean conversion', () => {
        const dataWithTruthyAnalyzer = { ...mockTranscriptionData, disableAnalyzer: 'true' as any };
        const dataWithFalsyAnalyzer = { ...mockTranscriptionData, disableAnalyzer: '' as any };

        const modelTruthy = new TranscriptionModel(dataWithTruthyAnalyzer);
        const modelFalsy = new TranscriptionModel(dataWithFalsyAnalyzer);

        expect(modelTruthy.disableAnalyzer).toBe(true);
        expect(modelFalsy.disableAnalyzer).toBe(false);
      });

      it('should determine isVideo based on type', () => {
        const videoData = { ...mockTranscriptionData, type: 'video/mp4' };
        const audioData = { ...mockTranscriptionData, type: 'audio/mp3' };
        const webmVideoData = { ...mockTranscriptionData, type: 'video/webm' };

        const videoModel = new TranscriptionModel(videoData);
        const audioModel = new TranscriptionModel(audioData);
        const webmModel = new TranscriptionModel(webmVideoData);

        expect(videoModel.isVideo).toBe(true);
        expect(audioModel.isVideo).toBe(false);
        expect(webmModel.isVideo).toBe(true);
      });


    });

    describe('url getter', () => {
      it('should generate correct edit URL', () => {
        const model = new TranscriptionModel(mockTranscriptionData);
        expect(model.url).toBe('/transcribe-edit/' + mockTranscriptionData.id);
      });

      it('should handle different IDs', () => {
        const dataWithDifferentId = { ...mockTranscriptionData, id: 'different-id-123' };
        const model = new TranscriptionModel(dataWithDifferentId);
        expect(model.url).toBe('/transcribe-edit/different-id-123');
      });
    });

    describe('length getter', () => {
      it('should format length as MM:SS', () => {
        const testCases = [
          { input: 65.0, expected: '01:05' },
          { input: 123.45, expected: '02:03' },
          { input: 30.0, expected: '00:30' },
          { input: 600.0, expected: '10:00' },
          { input: 3661.5, expected: '61:01' }, // Over 60 minutes
        ];

        testCases.forEach(({ input, expected }) => {
          const data = { ...mockTranscriptionData, length: input };
          const model = new TranscriptionModel(data);
          expect(model.lengthFriendly).toBe(expected);
        });
      });

      it('should handle zero length', () => {
        const data = { ...mockTranscriptionData, length: 0 };
        const model = new TranscriptionModel(data);
        expect(model.lengthFriendly).toBe('00:00');
      });

      it('should handle decimal seconds properly', () => {
        const data = { ...mockTranscriptionData, length: 61.789 };
        const model = new TranscriptionModel(data);
        expect(model.lengthFriendly).toBe('01:01');
      });

      it('should handle edge case length values', () => {
        const dataWithLargeLength = { ...mockTranscriptionData, length: 999999.999 };
        const model = new TranscriptionModel(dataWithLargeLength);
        
        // Should return a formatted string
        expect(typeof model.lengthFriendly).toBe('string');
        expect(model.lengthFriendly).toMatch(/^\d+:\d{2}$/);
      });
    });

    describe('length initialization', () => {
      it('should initialize internal length value from constructor', () => {
        const data = { ...mockTranscriptionData, length: 180.5 };
        const model = new TranscriptionModel(data);
        
        expect((model as any).length).toBe(180.5);
        expect(model.lengthFriendly).toBe('03:00'); // Getter should reflect constructor value
      });

      it('should handle different numeric values in constructor', () => {
        const testValues = [0, 30.5, 120, 3600.789];
        
        testValues.forEach(value => {
          const data = { ...mockTranscriptionData, length: value };
          const model = new TranscriptionModel(data);
          expect((model as any).length).toBe(value);
        });
      });
    });

    describe('property validation', () => {
      it('should handle undefined optional properties', () => {
        const minimalData: TranscriptionData = {
          id: 'test-id',
          title: 'Test Title',
          author: 'Test Author',
          authorFriendly: 'Test Author',
          type: 'audio/mp3',
          source: 'test.mp3',
          length: 60,
        };

        const model = new TranscriptionModel(minimalData);

        expect(model.comments).toBeUndefined();
        expect(model.dateLastUpdated).toBeUndefined();
        expect(model.userLastUpdated).toBeUndefined();
        expect(model.editors).toBeUndefined();
        expect(model.lang).toBeUndefined();
      });

      it('should handle null values appropriately', () => {
        const dataWithNulls = {
          ...mockTranscriptionData,
          comments: null as any,
          dateLastUpdated: null as any,
          userLastUpdated: null as any,
        };

        const model = new TranscriptionModel(dataWithNulls);

        expect(model.comments).toBeNull();
        expect(model.dateLastUpdated).toBeNull();
        expect(model.userLastUpdated).toBeNull();
      });
    });

    describe('ownership methods', () => {
      it('should correctly identify when transcription is mine', () => {
        const model = new TranscriptionModel(mockTranscriptionData);

        expect(model.isMine('test-author')).toBe(true);
        expect(model.isMine('different-user-id')).toBe(false);
        expect(model.isMine(undefined)).toBe(false);
        expect(model.isMine('')).toBe(false);
      });

      it('should return "me" for owner display when transcription is mine', () => {
        const model = new TranscriptionModel(mockTranscriptionData);

        expect(model.getOwnerDisplay('test-author')).toBe('me');
      });

      it('should return authorFriendly for owner display when transcription is not mine', () => {
        const model = new TranscriptionModel(mockTranscriptionData);

        expect(model.getOwnerDisplay('different-user-id')).toBe('Test Author');
        expect(model.getOwnerDisplay(undefined)).toBe('Test Author');
        expect(model.getOwnerDisplay('')).toBe('Test Author');
      });

      it('should use authorFriendly since it is a required field', () => {
        const model = new TranscriptionModel(mockTranscriptionData);

        expect(model.getOwnerDisplay('different-user-id')).toBe('Test Author');
        expect(model.authorFriendly).toBe('Test Author'); // Verify it's always available
      });

      it('should strip email domain from authorFriendly when showing owner display', () => {
        const dataWithEmail = {
          ...mockTranscriptionData,
          authorFriendly: 'foo.bar@home.com'
        };
        const model = new TranscriptionModel(dataWithEmail);

        expect(model.getOwnerDisplay('different-user-id')).toBe('foo.bar');
      });

      it('should handle authorFriendly without email domain', () => {
        const dataWithoutDomain = {
          ...mockTranscriptionData,
          authorFriendly: 'john.doe'
        };
        const model = new TranscriptionModel(dataWithoutDomain);

        expect(model.getOwnerDisplay('different-user-id')).toBe('john.doe');
      });
    });

    describe('last editor methods', () => {
      it('should correctly identify when transcription was last edited by me', () => {
        const model = new TranscriptionModel(mockTranscriptionData);

        expect(model.wasLastEditedByMe('test-user')).toBe(true);
        expect(model.wasLastEditedByMe('different-user-id')).toBe(false);
        expect(model.wasLastEditedByMe(undefined)).toBe(false);
        expect(model.wasLastEditedByMe('')).toBe(false);
      });

      it('should return "me" for last editor display when I was the last editor', () => {
        const model = new TranscriptionModel(mockTranscriptionData);

        expect(model.getLastEditorDisplay('test-user')).toBe('me');
      });

      it('should return userLastUpdated for last editor display when someone else was the last editor', () => {
        const model = new TranscriptionModel(mockTranscriptionData);

        expect(model.getLastEditorDisplay('different-user-id')).toBe('test-user');
        expect(model.getLastEditorDisplay(undefined)).toBe('test-user');
        expect(model.getLastEditorDisplay('')).toBe('test-user');
      });

      it('should strip email domain from userLastUpdated when showing last editor display', () => {
        const dataWithEmail = {
          ...mockTranscriptionData,
          userLastUpdated: 'jane.doe@company.com'
        };
        const model = new TranscriptionModel(dataWithEmail);

        expect(model.getLastEditorDisplay('different-user-id')).toBe('jane.doe');
      });

      it('should handle userLastUpdated without email domain', () => {
        const dataWithoutDomain = {
          ...mockTranscriptionData,
          userLastUpdated: 'alice'
        };
        const model = new TranscriptionModel(dataWithoutDomain);

        expect(model.getLastEditorDisplay('different-user-id')).toBe('alice');
      });
    });

    describe('access level methods', () => {
      it('should set access level to owner when user is the author', () => {
        const model = new TranscriptionModel(mockTranscriptionData);
        
        model.setAccessLevel('test-author');
        
        expect(model.accessLevel).toBe('owner');
      });

      it('should set access level to editor when user is in editors array', () => {
        const dataWithEditors = {
          ...mockTranscriptionData,
          editors: ['user1', 'test-user', 'user2'],
        };
        const model = new TranscriptionModel(dataWithEditors);
        
        model.setAccessLevel('test-user');
        
        expect(model.accessLevel).toBe('editor');
      });

      it('should set access level to viewer when user is in viewers array', () => {
        const dataWithViewers = {
          ...mockTranscriptionData,
          viewers: ['user1', 'test-user', 'user2'],
        };
        const model = new TranscriptionModel(dataWithViewers);
        
        model.setAccessLevel('test-user');
        
        expect(model.accessLevel).toBe('viewer');
      });

      it('should prioritize editor over viewer when user is in both arrays', () => {
        const dataWithBoth = {
          ...mockTranscriptionData,
          editors: ['test-user'],
          viewers: ['test-user'],
        };
        const model = new TranscriptionModel(dataWithBoth);
        
        model.setAccessLevel('test-user');
        
        expect(model.accessLevel).toBe('editor');
      });

      it('should set access level to null when user has no access', () => {
        const dataWithArrays = {
          ...mockTranscriptionData,
          editors: ['user1', 'user2'],
          viewers: ['user3', 'user4'],
        };
        const model = new TranscriptionModel(dataWithArrays);
        
        model.setAccessLevel('unknown-user');
        
        expect(model.accessLevel).toBe(null);
      });

      it('should set access level to null when no currentUserId provided', () => {
        const model = new TranscriptionModel(mockTranscriptionData);
        
        model.setAccessLevel(undefined);
        
        expect(model.accessLevel).toBe(null);
      });

      it('should handle null editors and viewers arrays', () => {
        const dataWithNulls = {
          ...mockTranscriptionData,
          editors: null,
          viewers: null,
        };
        const model = new TranscriptionModel(dataWithNulls);
        
        model.setAccessLevel('test-user');
        
        expect(model.accessLevel).toBe(null);
      });

      it('should handle empty editors and viewers arrays', () => {
        const dataWithEmpty = {
          ...mockTranscriptionData,
          editors: [],
          viewers: [],
        };
        const model = new TranscriptionModel(dataWithEmpty);
        
        model.setAccessLevel('test-user');
        
        expect(model.accessLevel).toBe(null);
      });

      it('should return correct access level display strings', () => {
        const model = new TranscriptionModel(mockTranscriptionData);
        
        model.accessLevel = 'owner';
        expect(model.getAccessLevelDisplay()).toBe('Owner');
        
        model.accessLevel = 'editor';
        expect(model.getAccessLevelDisplay()).toBe('Editor');
        
        model.accessLevel = 'viewer';
        expect(model.getAccessLevelDisplay()).toBe('Viewer');
        
        model.accessLevel = null;
        expect(model.getAccessLevelDisplay()).toBe('No Access');
      });

      it('should handle undefined access level gracefully', () => {
        const model = new TranscriptionModel(mockTranscriptionData);
        // Don't set access level, should default to undefined
        
        expect(model.getAccessLevelDisplay()).toBe('No Access');
      });
    });

    describe('isShared', () => {
      it('should return true when transcription has viewers', () => {
        const dataWithViewers = {
          ...mockTranscriptionData,
          viewers: ['user1', 'user2'],
          editors: null
        };
        const model = new TranscriptionModel(dataWithViewers);
        expect(model.isShared()).toBe(true);
      });

      it('should return true when transcription has editors', () => {
        const dataWithEditors = {
          ...mockTranscriptionData,
          viewers: null,
          editors: ['user1', 'user2']
        };
        const model = new TranscriptionModel(dataWithEditors);
        expect(model.isShared()).toBe(true);
      });

      it('should return true when transcription has both viewers and editors', () => {
        const dataWithBoth = {
          ...mockTranscriptionData,
          viewers: ['user1'],
          editors: ['user2']
        };
        const model = new TranscriptionModel(dataWithBoth);
        expect(model.isShared()).toBe(true);
      });

      it('should return false when transcription has no viewers or editors', () => {
        const dataWithNone = {
          ...mockTranscriptionData,
          viewers: null,
          editors: null
        };
        const model = new TranscriptionModel(dataWithNone);
        expect(model.isShared()).toBe(false);
      });

      it('should return false when viewers and editors are empty arrays', () => {
        const dataWithEmptyArrays = {
          ...mockTranscriptionData,
          viewers: [],
          editors: []
        };
        const model = new TranscriptionModel(dataWithEmptyArrays);
        expect(model.isShared()).toBe(false);
      });

      it('should return false when viewers and editors are undefined', () => {
        const dataWithUndefined = {
          ...mockTranscriptionData,
          viewers: undefined,
          editors: undefined
        };
        const model = new TranscriptionModel(dataWithUndefined);
        expect(model.isShared()).toBe(false);
      });
    });
  });

  describe('RegionModel', () => {
    const mockRegionData: RegionData = {
      id: 'test-region-id',
      createdAt: '2023-01-01T00:00:00Z',
      dateLastUpdated: '2023-01-01T00:00:00Z',
      end: 20.5,
      start: 10.0,
      isNote: true,
      text: '[{"insert":"Hello world"}]',
      transcriptionId: 'test-transcription-id',
      translation: 'Bonjour monde',
      userLastUpdated: 'test-user',
      index: 1,
    };

    beforeEach(() => {
      jest.clearAllMocks();
      // Mock console methods to avoid output during tests
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('constructor', () => {
      it('should have correct constructor signature', () => {
        expect(typeof RegionModel).toBe('function');
        expect(RegionModel.length).toBe(1); // Should accept 1 parameter
      });

      it('should map all basic properties correctly', () => {
        const model = new RegionModel(mockRegionData);

        expect(model.id).toBe(mockRegionData.id);
        expect(model.createdAt).toBe(mockRegionData.createdAt);
        expect(model.dateLastUpdated).toBe(mockRegionData.dateLastUpdated);
        expect(model.end).toBe(mockRegionData.end);
        expect(model.start).toBe(mockRegionData.start);
        expect(model.transcriptionId).toBe(mockRegionData.transcriptionId);
        expect(model.translation).toBe(mockRegionData.translation);
        expect(model.userLastUpdated).toBe(mockRegionData.userLastUpdated);
        expect(model.index).toBe(mockRegionData.index);
      });

      it('should convert isNote to boolean', () => {
        const testCases = [
          { input: true, expected: true },
          { input: false, expected: false },
          { input: 1, expected: true },
          { input: 0, expected: false },
          { input: 'true', expected: true },
          { input: '', expected: false },
          { input: null, expected: false },
          { input: undefined, expected: false },
        ];

        testCases.forEach(({ input, expected }) => {
          const data = { ...mockRegionData, isNote: input as any };
          const model = new RegionModel(data);
          expect(model.isNote).toBe(expected);
        });
      });

      it('should handle default translation value', () => {
        const dataWithoutTranslation = { ...mockRegionData };
        delete dataWithoutTranslation.translation;

        const model = new RegionModel(dataWithoutTranslation);
        expect(model.translation).toBe('');
      });

      it('should construct without throwing errors', () => {
        expect(() => new RegionModel(mockRegionData)).not.toThrow();
        
        const model = new RegionModel(mockRegionData);
        expect(model).toBeInstanceOf(RegionModel);
      });
    });

    describe('text handling', () => {
      it('should handle regionText format', () => {
        const dataWithRegionText = {
          ...mockRegionData,
          regionText: 'Hello from regionText',
        };
        delete dataWithRegionText.text;

        const model = new RegionModel(dataWithRegionText);
        
        expect(model.regionText).toBe('Hello from regionText');
      });

      it('should handle missing regionText property', () => {
        const dataWithoutRegionText = { ...mockRegionData };
        delete dataWithoutRegionText.regionText;

        const model = new RegionModel(dataWithoutRegionText);
        
        expect(model.regionText).toBe('');
      });

      it('should handle empty regionText', () => {
        const dataWithEmptyRegionText = {
          ...mockRegionData,
          regionText: '',
        };

        const model = new RegionModel(dataWithEmptyRegionText);
        
        expect(model.regionText).toBe('');
      });

      it('should handle regionText with special characters', () => {
        const specialText = 'Text with émojis 🎉 and symbols: @#$%^&*()';
        const dataWithSpecialText = {
          ...mockRegionData,
          regionText: specialText,
        };

        const model = new RegionModel(dataWithSpecialText);
        
        expect(model.regionText).toBe(specialText);
      });

      it('should handle long regionText content', () => {
        const longText = 'A'.repeat(10000);
        const dataWithLongText = {
          ...mockRegionData,
          regionText: longText,
        };

        const model = new RegionModel(dataWithLongText);
        
        expect(model.regionText).toBe(longText);
      });
    });

    describe('optional properties handling', () => {
      it('should handle missing optional properties', () => {
        const minimalData: RegionData = {
          id: 'test-id',
          end: 20,
          start: 10,
          transcriptionId: 'test-transcription-id',
        };

        const model = new RegionModel(minimalData);

        expect(model.createdAt).toBeUndefined();
        expect(model.dateLastUpdated).toBeUndefined();
        expect(model.isNote).toBe(false);
        expect(model.translation).toBe('');
        expect(model.userLastUpdated).toBeUndefined();
        expect(model.index).toBeUndefined();
        expect(model.regionText).toBe('');
      });

      it('should handle null values', () => {
        const dataWithNulls = {
          ...mockRegionData,
          createdAt: null as any,
          dateLastUpdated: null as any,
          userLastUpdated: null as any,
          index: null as any,
        };

        const model = new RegionModel(dataWithNulls);

        expect(model.createdAt).toBeNull();
        expect(model.dateLastUpdated).toBeNull();
        expect(model.userLastUpdated).toBeNull();
        expect(model.index).toBeNull();
      });
    });

    describe('edge cases', () => {
      it('should handle zero start and end times', () => {
        const dataWithZeros = {
          ...mockRegionData,
          start: 0,
          end: 0,
        };

        const model = new RegionModel(dataWithZeros);

        expect(model.start).toBe(0);
        expect(model.end).toBe(0);
      });

      it('should handle negative time values', () => {
        const dataWithNegatives = {
          ...mockRegionData,
          start: -5,
          end: -1,
        };

        const model = new RegionModel(dataWithNegatives);

        expect(model.start).toBe(-5);
        expect(model.end).toBe(-1);
      });

      it('should handle very large time values', () => {
        const dataWithLargeValues = {
          ...mockRegionData,
          start: 999999.999,
          end: 1000000.001,
        };

        const model = new RegionModel(dataWithLargeValues);

        expect(model.start).toBe(999999.999);
        expect(model.end).toBe(1000000.001);
      });

      it('should handle empty string values', () => {
        const dataWithEmptyStrings = {
          ...mockRegionData,
          id: '',
          transcriptionId: '',
          translation: '',
        };

        const model = new RegionModel(dataWithEmptyStrings);

        expect(model.id).toBe('');
        expect(model.transcriptionId).toBe('');
        expect(model.translation).toBe('');
      });
    });

    describe('version tracking', () => {
      it('should set _version from data when provided', () => {
        const dataWithVersion = { 
          ...mockRegionData, 
          _version: 5 
        };
        const model = new RegionModel(dataWithVersion);
        
        expect(model._version).toBe(5);
      });

      it('should default _version to 1 when not provided', () => {
        const model = new RegionModel(mockRegionData);
        
        expect(model._version).toBe(1);
      });

      it('should handle _version as 0', () => {
        const dataWithVersion = { 
          ...mockRegionData, 
          _version: 0 
        };
        const model = new RegionModel(dataWithVersion);
        
        expect(model._version).toBe(0); // 0 is a valid version number
      });

      it('should handle undefined _version with warning', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        const dataWithVersion = { 
          ...mockRegionData, 
          _version: undefined 
        };
        const model = new RegionModel(dataWithVersion);
        
        expect(model._version).toBe(1);
        expect(consoleSpy).toHaveBeenCalledWith(
          'RegionModel: Missing _version for region', 
          mockRegionData.id, 
          '- should only happen during initial creation'
        );
        
        consoleSpy.mockRestore();
      });
    });
  });

  describe('InviteModel', () => {
    const mockInviteData: InviteData = {
      id: 'invite_test123',
      email: 'test@example.com',
      status: 'pending',
      permissionLevel: 'viewer',
      expiresAt: '2024-12-31T23:59:59.000Z',
      invitedBy: 'user-123',
      invitedByFriendly: 'test.user@example.com',
      createdAt: '2024-01-01T00:00:00.000Z',
      transcriptionId: 'transcription-456',
      transcriptionTitle: 'Test Transcription Title',
    };

    beforeEach(() => {
      jest.clearAllMocks();
      // Mock console methods to avoid output during tests
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('constructor', () => {
      it('should have correct constructor signature', () => {
        expect(typeof InviteModel).toBe('function');
        expect(InviteModel.length).toBe(1); // Should accept 1 parameter
      });

      it('should map all basic properties correctly', () => {
        const model = new InviteModel(mockInviteData);

        expect(model.id).toBe(mockInviteData.id);
        expect(model.email).toBe(mockInviteData.email);
        expect(model.status).toBe(mockInviteData.status);
        expect(model.permissionLevel).toBe(mockInviteData.permissionLevel);
        expect(model.expiresAt).toBe(mockInviteData.expiresAt);
        expect(model.invitedBy).toBe(mockInviteData.invitedBy);
        expect(model.invitedByFriendly).toBe(mockInviteData.invitedByFriendly);
        expect(model.createdAt).toBe(mockInviteData.createdAt);
        expect(model.transcriptionId).toBe(mockInviteData.transcriptionId);
        expect(model.transcriptionTitle).toBe(mockInviteData.transcriptionTitle);
      });

      it('should handle optional acceptedAt property', () => {
        const dataWithAcceptedAt = {
          ...mockInviteData,
          acceptedAt: '2024-06-15T12:00:00.000Z',
        };

        const model = new InviteModel(dataWithAcceptedAt);
        expect(model.acceptedAt).toBe('2024-06-15T12:00:00.000Z');

        const modelWithoutAcceptedAt = new InviteModel(mockInviteData);
        expect(modelWithoutAcceptedAt.acceptedAt).toBeUndefined();
      });

      it('should handle optional updatedAt property', () => {
        const dataWithUpdatedAt = {
          ...mockInviteData,
          updatedAt: '2024-06-15T12:00:00.000Z',
        };

        const model = new InviteModel(dataWithUpdatedAt);
        expect(model.updatedAt).toBe('2024-06-15T12:00:00.000Z');

        const modelWithoutUpdatedAt = new InviteModel(mockInviteData);
        expect(modelWithoutUpdatedAt.updatedAt).toBeUndefined();
      });

      it('should construct without throwing errors', () => {
        expect(() => new InviteModel(mockInviteData)).not.toThrow();
        
        const model = new InviteModel(mockInviteData);
        expect(model).toBeInstanceOf(InviteModel);
      });
    });

    describe('statusDisplay getter', () => {
      it('should return capitalized status for known statuses', () => {
        const statuses = ['accepted', 'declined'];
        
        statuses.forEach(status => {
          const data = { ...mockInviteData, status };
          const model = new InviteModel(data);
          expect(model.statusDisplay).toBe(status.charAt(0).toUpperCase() + status.slice(1));
        });
      });

      it('should return "expired" for expired pending invites', () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 7);
        
        const data = { 
          ...mockInviteData, 
          status: 'pending',
          expiresAt: pastDate.toISOString()
        };
        const model = new InviteModel(data);
        expect(model.statusDisplay).toBe('expired');
      });

      it('should return "Pending" for non-expired pending invites', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        
        const data = { 
          ...mockInviteData, 
          status: 'pending',
          expiresAt: futureDate.toISOString()
        };
        const model = new InviteModel(data);
        expect(model.statusDisplay).toBe('Pending');
      });

      it('should handle unknown status values', () => {
        const data = { ...mockInviteData, status: 'unknown-status' };
        const model = new InviteModel(data);
        expect(model.statusDisplay).toBe('Unknown-status');
      });

      it('should handle empty status', () => {
        const data = { ...mockInviteData, status: '' };
        const model = new InviteModel(data);
        expect(model.statusDisplay).toBe('');
      });
    });

    describe('isExpired getter', () => {
      it('should return true for expired invites', () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 7); // 7 days ago
        
        const expiredData = {
          ...mockInviteData,
          expiresAt: pastDate.toISOString(),
        };
        const model = new InviteModel(expiredData);
        expect(model.isExpired).toBe(true);
      });

      it('should return false for non-expired invites', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
        
        const futureData = {
          ...mockInviteData,
          expiresAt: futureDate.toISOString(),
        };
        const model = new InviteModel(futureData);
        expect(model.isExpired).toBe(false);
      });

      it('should handle edge case of exactly current time', () => {
        // Add a small buffer to ensure test doesn't fail due to timing precision
        const futureTime = new Date(Date.now() + 10); // 10ms in the future
        const exactData = {
          ...mockInviteData,
          expiresAt: futureTime.toISOString(),
        };
        const model = new InviteModel(exactData);
        // Should not be expired when expiry is in the future
        expect(model.isExpired).toBe(false);
      });
    });

    describe('date formatting getters', () => {
      beforeEach(() => {
        // Mock toLocaleDateString to return consistent results
        jest.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('1/1/2024');
      });

      describe('expiresAtFormatted', () => {
        it('should format expires at date correctly', () => {
          const model = new InviteModel(mockInviteData);
          expect(model.expiresAtFormatted).toBe('1/1/2024');
        });

        it('should handle invalid expiration date', () => {
          const invalidData = { ...mockInviteData, expiresAt: 'invalid-date' };
          const model = new InviteModel(invalidData);
          expect(model.expiresAtFormatted).toBe('Invalid Date');
        });
      });

      describe('createdAtFormatted', () => {
        it('should format created at date correctly', () => {
          const model = new InviteModel(mockInviteData);
          expect(model.createdAtFormatted).toBe('1/1/2024');
        });

        it('should handle invalid creation date', () => {
          const invalidData = { ...mockInviteData, createdAt: 'invalid-date' };
          const model = new InviteModel(invalidData);
          expect(model.createdAtFormatted).toBe('Invalid Date');
        });
      });
    });

    describe('permission level validation', () => {
      it('should handle viewer permission level', () => {
        const viewerData = { ...mockInviteData, permissionLevel: 'viewer' as const };
        const model = new InviteModel(viewerData);
        expect(model.permissionLevel).toBe('viewer');
      });

      it('should handle editor permission level', () => {
        const editorData = { ...mockInviteData, permissionLevel: 'editor' as const };
        const model = new InviteModel(editorData);
        expect(model.permissionLevel).toBe('editor');
      });
    });

    describe('edge cases', () => {
      it('should handle empty email', () => {
        const data = { ...mockInviteData, email: '' };
        const model = new InviteModel(data);
        expect(model.email).toBe('');
      });

      it('should handle empty transcription title', () => {
        const data = { ...mockInviteData, transcriptionTitle: '' };
        const model = new InviteModel(data);
        expect(model.transcriptionTitle).toBe('');
      });

      it('should handle minimal required data', () => {
        const minimalData: InviteData = {
          id: 'test-id',
          email: 'test@example.com',
          status: 'pending',
          permissionLevel: 'viewer',
          expiresAt: '2024-12-31T23:59:59.000Z',
          invitedBy: 'user-123',
          invitedByFriendly: 'test.user@example.com',
          createdAt: '2024-01-01T00:00:00.000Z',
          transcriptionId: 'transcription-456',
          transcriptionTitle: 'Test Title',
        };

        const model = new InviteModel(minimalData);
        expect(model.id).toBe('test-id');
        expect(model.acceptedAt).toBeUndefined();
        expect(model.updatedAt).toBeUndefined();
      });
    });
  });
}); 