const specialProcessing = require('../lib/special-processing');

describe('missing FST files handling', () => {
  // Mock a language processor without certain FST files
  const mockLanguageCode = 'test-lang';
  
  beforeEach(() => {
    // Create a mock processor with only strict-analyzer
    specialProcessing.languages[mockLanguageCode] = {
      processCharacters: (text) => text,
      FST_FILES: {
        'strict-analyzer': 'test-strict.hfstol'
        // No relaxed-analyzer or strict-generator
      }
    };
  });

  afterEach(() => {
    // Restore original languages
    delete specialProcessing.languages[mockLanguageCode];
  });

  describe('hasFstFile', () => {
    it('returns true for existing FST file types', () => {
      expect(specialProcessing.hasFstFile(mockLanguageCode, 'strict-analyzer')).toBe(true);
    });

    it('returns false for missing FST file types', () => {
      expect(specialProcessing.hasFstFile(mockLanguageCode, 'relaxed-analyzer')).toBe(false);
      expect(specialProcessing.hasFstFile(mockLanguageCode, 'strict-generator')).toBe(false);
    });

    it('returns false for languages without FST_FILES', () => {
      delete specialProcessing.languages[mockLanguageCode].FST_FILES;
      expect(specialProcessing.hasFstFile(mockLanguageCode, 'strict-analyzer')).toBe(false);
    });

    it('returns false for non-existent languages', () => {
      expect(specialProcessing.hasFstFile('non-existent', 'strict-analyzer')).toBe(false);
    });
  });

  describe('getLanguageProcessor with missing FST files', () => {
    it('returns processor even if some FST files are missing', () => {
      const processor = specialProcessing.getLanguageProcessor(mockLanguageCode);
      expect(processor).toBeDefined();
      expect(processor.FST_FILES).toBeDefined();
      expect(processor.FST_FILES['strict-analyzer']).toBeDefined();
      expect(processor.FST_FILES['relaxed-analyzer']).toBeUndefined();
      expect(processor.FST_FILES['strict-generator']).toBeUndefined();
    });

    it('handles languages with no FST_FILES', () => {
      delete specialProcessing.languages[mockLanguageCode].FST_FILES;
      const processor = specialProcessing.getLanguageProcessor(mockLanguageCode);
      expect(processor).toBeDefined();
      expect(processor.FST_FILES).toBeUndefined();
    });
  });

  describe('real language examples', () => {
    it('otwc has strict and relaxed analyzers but no generator', () => {
      expect(specialProcessing.hasFstFile('otwc', 'strict-analyzer')).toBe(true);
      expect(specialProcessing.hasFstFile('otwc', 'relaxed-analyzer')).toBe(true);
      expect(specialProcessing.hasFstFile('otwc', 'strict-generator')).toBe(false);
    });

    it('otwr has strict and relaxed analyzers but no generator', () => {
      expect(specialProcessing.hasFstFile('otwr', 'strict-analyzer')).toBe(true);
      expect(specialProcessing.hasFstFile('otwr', 'relaxed-analyzer')).toBe(true);
      expect(specialProcessing.hasFstFile('otwr', 'strict-generator')).toBe(false);
    });

    it('crk has all three FST file types', () => {
      expect(specialProcessing.hasFstFile('crk', 'strict-analyzer')).toBe(true);
      expect(specialProcessing.hasFstFile('crk', 'relaxed-analyzer')).toBe(true);
      expect(specialProcessing.hasFstFile('crk', 'strict-generator')).toBe(true);
    });
  });
});

