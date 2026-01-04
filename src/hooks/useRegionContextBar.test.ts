// Jest globals are available globally
import { findMatchingItems, computeCursorAnalysis } from './useRegionContextBar';
import type { WordAnalysis, SpellingSuggestion } from '../services/adt';

describe('findMatchingItems', () => {
  it('returns empty array when items is undefined', () => {
    const result = findMatchingItems<WordAnalysis>(undefined, 'test');
    expect(result).toEqual([]);
  });

  it('returns empty array when cursorWord is null', () => {
    const items: WordAnalysis[] = [
      { word: 'test', analysis: 'test+N', allAnalysis: ['test+N'] },
    ];
    const result = findMatchingItems(items, null);
    expect(result).toEqual([]);
  });

  it('returns matching items case-insensitively', () => {
    const items: WordAnalysis[] = [
      { word: 'Test', analysis: 'test+N', allAnalysis: ['test+N'] },
      { word: 'other', analysis: 'other+N', allAnalysis: ['other+N'] },
    ];
    const result = findMatchingItems(items, 'TEST');
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe('Test');
  });

  it('returns multiple matches for duplicate words', () => {
    const items: WordAnalysis[] = [
      { word: 'isi', analysis: 'isi+Ipc', allAnalysis: ['isi+Ipc'], index: 0 },
      { word: 'foo', analysis: 'foo+N', allAnalysis: ['foo+N'], index: 1 },
      { word: 'isi', analysis: 'isi+VAI', allAnalysis: ['isi+VAI'], index: 2 },
    ];
    const result = findMatchingItems(items, 'isi');
    expect(result).toHaveLength(2);
  });

  it('works with SpellingSuggestion type', () => {
    const items: SpellingSuggestion[] = [
      { word: 'awsis', allSuggestions: ['awas', 'wasis'] },
      { word: 'foo', allSuggestions: ['bar'] },
    ];
    const result = findMatchingItems(items, 'awsis');
    expect(result).toHaveLength(1);
    expect(result[0].allSuggestions).toEqual(['awas', 'wasis']);
  });
});

describe('computeCursorAnalysis', () => {
  describe('when cursorWord is null', () => {
    it('returns null values', () => {
      const result = computeCursorAnalysis('some text', [], [], null);
      expect(result).toEqual({
        cursorWord: null,
        cursorWordAnalysis: null,
        wordIndex: null,
        spellingSuggestions: [],
      });
    });
  });

  describe('with spelling suggestions', () => {
    it('returns suggestions when cursor is on misspelled word', () => {
      const suggestions: SpellingSuggestion[] = [
        { word: 'awsis', allSuggestions: ['awas', 'wasis'] },
      ];
      const result = computeCursorAnalysis(
        'awsis is here',
        [],
        suggestions,
        { word: 'awsis', index: 0 }
      );
      expect(result.cursorWord).toBe('awsis');
      expect(result.cursorWordAnalysis).toBeNull();
      expect(result.spellingSuggestions).toEqual(['awas', 'wasis']);
    });

    it('prioritizes suggestions over analysis', () => {
      const analyses: WordAnalysis[] = [
        { word: 'awsis', analysis: 'awsis+N', allAnalysis: ['awsis+N'] },
      ];
      const suggestions: SpellingSuggestion[] = [
        { word: 'awsis', allSuggestions: ['awas'] },
      ];
      const result = computeCursorAnalysis(
        'awsis',
        analyses,
        suggestions,
        { word: 'awsis', index: 0 }
      );
      expect(result.spellingSuggestions).toEqual(['awas']);
      expect(result.cursorWordAnalysis).toBeNull();
    });
  });

  describe('with word analysis', () => {
    it('returns analysis for known word', () => {
      const analyses: WordAnalysis[] = [
        { word: 'isi', analysis: 'isi+Ipc', allAnalysis: ['isi+Ipc', 'isi+VAI'] },
      ];
      const result = computeCursorAnalysis(
        'isi is here',
        analyses,
        [],
        { word: 'isi', index: 0 }
      );
      expect(result.cursorWord).toBe('isi');
      expect(result.cursorWordAnalysis?.analysis).toBe('isi+Ipc');
      expect(result.wordIndex).toBe(0);
      expect(result.spellingSuggestions).toEqual([]);
    });

    it('returns null for unknown word', () => {
      const analyses: WordAnalysis[] = [
        { word: 'isi', analysis: 'isi+Ipc', allAnalysis: ['isi+Ipc'] },
      ];
      const result = computeCursorAnalysis(
        'isi and unknown',
        analyses,
        [],
        { word: 'unknown', index: 8 }
      );
      expect(result.cursorWord).toBeNull();
      expect(result.cursorWordAnalysis).toBeNull();
    });

    it('handles duplicate words with occurrence matching', () => {
      const analyses: WordAnalysis[] = [
        { word: 'isi', analysis: 'isi+Ipc', allAnalysis: ['isi+Ipc'], index: 0 },
        { word: 'foo', analysis: 'foo+N', allAnalysis: ['foo+N'], index: 1 },
        { word: 'isi', analysis: 'isi+VAI', allAnalysis: ['isi+VAI'], index: 2 },
      ];
      // Cursor on second "isi" (at position 8 in "isi foo isi")
      const result = computeCursorAnalysis(
        'isi foo isi',
        analyses,
        [],
        { word: 'isi', index: 8 }
      );
      expect(result.cursorWordAnalysis?.analysis).toBe('isi+VAI');
      expect(result.wordIndex).toBe(2);
    });
  });
});
