import { TranscriptionModel, RegionModel } from './adt';
import type { TranscriptionData, RegionData } from './adt';

describe('ADT Models', () => {
  describe('TranscriptionModel', () => {
    const mockTranscriptionData: TranscriptionData = {
      id: 'test-transcription-id',
      title: 'Test Transcription',
      comments: 'Test comments',
      author: 'test-author',
      type: 'audio/mp3',
      issues: 5,
      source: 'test-source.mp3',
      coverage: 85.5,
      isPrivate: true,
      disableAnalyzer: false,
      dateLastUpdated: '2023-01-01T00:00:00Z',
      userLastUpdated: 'test-user',
      length: 123.45,
      contributors: null,
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

      it('should handle contributors with toArray method', async () => {
        const mockContributors = {
          toArray: jest.fn().mockResolvedValue([
            { contributorID: 'user1' },
            { contributorID: 'user2' },
            { contributorID: 'user3' },
          ]),
        };

        const dataWithContributors = { ...mockTranscriptionData, contributors: mockContributors };
        const model = new TranscriptionModel(dataWithContributors);

        // Wait for async contributors loading
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockContributors.toArray).toHaveBeenCalled();
        expect(model.editors).toEqual(['user1', 'user2', 'user3']);
      });

      it('should handle contributors without toArray method', () => {
        const dataWithoutToArray = { ...mockTranscriptionData, contributors: {} };
        
        expect(() => new TranscriptionModel(dataWithoutToArray)).not.toThrow();
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
          expect(model.length).toBe(expected);
        });
      });

      it('should handle zero length', () => {
        const data = { ...mockTranscriptionData, length: 0 };
        const model = new TranscriptionModel(data);
        expect(model.length).toBe('00:00');
      });

      it('should handle decimal seconds properly', () => {
        const data = { ...mockTranscriptionData, length: 61.789 };
        const model = new TranscriptionModel(data);
        expect(model.length).toBe('01:01');
      });

      it('should handle edge case length values', () => {
        const dataWithLargeLength = { ...mockTranscriptionData, length: 999999.999 };
        const model = new TranscriptionModel(dataWithLargeLength);
        
        // Should return a formatted string
        expect(typeof model.length).toBe('string');
        expect(model.length).toMatch(/^\d+:\d{2}$/);
      });
    });

    describe('length setter', () => {
      it('should set internal length value', () => {
        const model = new TranscriptionModel(mockTranscriptionData);
        
        model.length = 180.5;
        expect((model as any)._length).toBe(180.5);
        expect(model.length).toBe('03:00'); // Getter should reflect new value
      });

      it('should handle different numeric values', () => {
        const model = new TranscriptionModel(mockTranscriptionData);
        
        const testValues = [0, 30.5, 120, 3600.789];
        
        testValues.forEach(value => {
          model.length = value;
          expect((model as any)._length).toBe(value);
        });
      });
    });

    describe('property validation', () => {
      it('should handle undefined optional properties', () => {
        const minimalData: TranscriptionData = {
          id: 'test-id',
          title: 'Test Title',
          author: 'Test Author',
          type: 'audio/mp3',
          source: 'test.mp3',
          length: 60,
        };

        const model = new TranscriptionModel(minimalData);

        expect(model.comments).toBeUndefined();
        expect(model.dateLastUpdated).toBeUndefined();
        expect(model.userLastUpdated).toBeUndefined();
        expect(model.editors).toBeUndefined();
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
  });

  describe('RegionModel', () => {
    const mockRegionData: RegionData = {
      id: 'test-region-id',
      createdAt: '2023-01-01T00:00:00Z',
      dateLastUpdated: '2023-01-01T00:00:00Z',
      end: 20.5,
      start: 10.0,
      isNote: true,
      comments: 'Test comments',
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
        
        expect(model.text).toEqual([{ insert: 'Hello from regionText' }]);
      });

      it('should handle text as JSON string', () => {
        const textData = [
          { insert: 'Hello ' },
          { insert: 'world', attributes: { bold: true } },
        ];
        const dataWithJsonText = {
          ...mockRegionData,
          text: JSON.stringify(textData),
        };

        const model = new RegionModel(dataWithJsonText);
        
        expect(model.text).toEqual(textData);
      });

      it('should handle text as array', () => {
        const textData = [
          { insert: 'Direct array' },
          { insert: ' text', attributes: { italic: true } },
        ];
        const dataWithArrayText = {
          ...mockRegionData,
          text: textData,
        };

        const model = new RegionModel(dataWithArrayText);
        
        expect(model.text).toEqual(textData);
      });

      it('should handle --not used-- text value', () => {
        const dataWithNotUsedText = {
          ...mockRegionData,
          text: '--not used--',
        };

        const model = new RegionModel(dataWithNotUsedText);
        
        expect(model.text).toEqual([]);
      });

      it('should handle missing text property', () => {
        const dataWithoutText = { ...mockRegionData };
        delete dataWithoutText.text;

        const model = new RegionModel(dataWithoutText);
        
        expect(model.text).toEqual([]);
      });

      it('should prioritize regionText over text', () => {
        const dataWithBoth = {
          ...mockRegionData,
          regionText: 'From regionText',
          text: '[{"insert":"From text"}]',
        };

        const model = new RegionModel(dataWithBoth);
        
        expect(model.text).toEqual([{ insert: 'From regionText' }]);
      });

      it('should handle invalid JSON in text gracefully', () => {
        const consoleSpy = jest.spyOn(console, 'error');
        const dataWithInvalidJson = {
          ...mockRegionData,
          text: '{"invalid": json}',
        };

        expect(() => new RegionModel(dataWithInvalidJson)).toThrow();
        expect(consoleSpy).toHaveBeenCalledWith('Error constructing RegionModel:', expect.any(Error));
        expect(consoleSpy).toHaveBeenCalledWith('Data:', expect.any(String));
      });
    });

    describe('error handling', () => {
      it('should handle construction errors and log details', () => {
        const consoleSpy = jest.spyOn(console, 'error');
        
        // Create data that will cause JSON.parse to fail
        const invalidData = {
          ...mockRegionData,
          text: 'invalid json string',
        };

        expect(() => new RegionModel(invalidData)).toThrow();
        
        expect(consoleSpy).toHaveBeenCalledWith('Error constructing RegionModel:', expect.any(Error));
        expect(consoleSpy).toHaveBeenCalledWith('Data:', JSON.stringify(invalidData, null, 2));
      });

      it('should propagate construction errors', () => {
        const invalidData = {
          ...mockRegionData,
          text: '{invalid json',
        };

        expect(() => new RegionModel(invalidData)).toThrow();
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
        expect(model.text).toEqual([]);
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
  });
}); 