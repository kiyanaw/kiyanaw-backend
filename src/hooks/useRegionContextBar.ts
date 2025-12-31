import { useMemo, useCallback } from 'react';
import { REGION_TEXT_MATCH_PATTERN } from '../constants/text-patterns';
import { useEditorStore } from '../stores/useEditorStore';
import { selectWordAnalysis } from '../use-cases/select-word-analysis';
import { type WordAnalysis, type SpellingSuggestion, type CursorMatchable } from '../services/adt';

/**
 * Generic filter for any CursorMatchable data.
 * Works with WordAnalysis, SpellingSuggestion, and future types.
 * @internal Exported for testing
 */
export function findMatchingItems<T extends CursorMatchable>(
  items: T[] | undefined,
  cursorWord: string | null
): T[] {
  if (!items || !cursorWord) return [];
  const normalized = cursorWord.toLowerCase();
  return items.filter(item => item.word.toLowerCase() === normalized);
}

interface CursorAnalysisResult {
  cursorWord: string | null;
  cursorWordAnalysis: WordAnalysis | null;
  wordIndex: number | null;
  spellingSuggestions: string[];  // The actual suggestion strings for display
}

/**
 * @internal Exported for testing
 */
export const computeCursorAnalysis = (
  regionText: string,
  analyses: WordAnalysis[] | undefined,
  suggestions: SpellingSuggestion[] | undefined,
  cursorWord: { word: string; index: number } | null
): CursorAnalysisResult => {
  if (!cursorWord) {
    return { cursorWord: null, cursorWordAnalysis: null, wordIndex: null, spellingSuggestions: [] };
  }

  // Use generic matching for suggestions
  const matchingSuggestions = findMatchingItems(suggestions, cursorWord.word);

  if (matchingSuggestions.length > 0) {
    // This is a misspelled word - return the suggestion strings for display
    // Take allSuggestions from the first matching SpellingSuggestion
    return {
      cursorWord: cursorWord.word,
      cursorWordAnalysis: null,
      wordIndex: null,
      spellingSuggestions: matchingSuggestions[0].allSuggestions,
    };
  }

  // No suggestions - check for analysis using generic matching
  const matchingAnalysisItems = findMatchingItems(analyses, cursorWord.word);

  if (matchingAnalysisItems.length === 0) {
    return { cursorWord: null, cursorWordAnalysis: null, wordIndex: null, spellingSuggestions: [] };
  }

  // Map to include original indices for selection
  const matchingAnalyses = (analyses || [])
    .map((analysis, index) => ({ analysis, index }))
    .filter(({ analysis }) => analysis.word.toLowerCase() === cursorWord.word.toLowerCase());

  if (matchingAnalyses.length === 0) {
    return { cursorWord: null, cursorWordAnalysis: null, wordIndex: null, spellingSuggestions: [] };
  }

  if (matchingAnalyses.length === 1) {
    return {
      cursorWord: cursorWord.word,
      cursorWordAnalysis: matchingAnalyses[0].analysis,
      wordIndex: matchingAnalyses[0].index,
      spellingSuggestions: [],
    };
  }

  // Multiple analyses for the same word - match by occurrence index
  const tokens = regionText.split(REGION_TEXT_MATCH_PATTERN);
  const wordPositions: Array<{ word: string; start: number; end: number }> = [];
  let currentPos = 0;

  for (const token of tokens) {
    if (REGION_TEXT_MATCH_PATTERN.test(token)) {
      wordPositions.push({
        word: token.toLowerCase(),
        start: currentPos,
        end: currentPos + token.length,
      });
    }
    currentPos += token.length;
  }

  const matchingWordPositions = wordPositions.filter(
    (position) => position.word === cursorWord.word.toLowerCase()
  );
  const cursorOccurrenceIndex = matchingWordPositions.findIndex(
    (position) => cursorWord.index >= position.start && cursorWord.index < position.end
  );

  const matchedAnalysis =
    cursorOccurrenceIndex >= 0 && cursorOccurrenceIndex < matchingAnalyses.length
      ? matchingAnalyses[cursorOccurrenceIndex]
      : matchingAnalyses[0];

  return {
    cursorWord: cursorWord.word,
    cursorWordAnalysis: matchedAnalysis.analysis,
    wordIndex: matchedAnalysis.index,
    spellingSuggestions: [],
  };
};

export const useRegionContextBar = (regionId: string, canEdit: boolean) => {
  const region = useEditorStore((state) => state.regionById(regionId));
  const cursorWordInfo = useEditorStore(
    (state) => state.regionCursorWords?.[regionId] ?? null
  );

  const { cursorWord, cursorWordAnalysis, wordIndex, spellingSuggestions } = useMemo(
    () =>
      computeCursorAnalysis(
        region?.text || region?.regionText || '',
        region?.regionAnalysis,
        region?.regionSuggestions,
        cursorWordInfo
      ),
    [region?.regionAnalysis, region?.regionSuggestions, region?.regionText, region?.text, cursorWordInfo]
  );

  const handleSelectAnalysis = useCallback(
    async (selectedAnalysis: string) => {
      if (!canEdit || cursorWordAnalysis === null || wordIndex === null) {
        return;
      }

      await selectWordAnalysis(regionId, wordIndex, selectedAnalysis);
    },
    [canEdit, cursorWordAnalysis, wordIndex, regionId]
  );

  return {
    cursorWord,
    cursorWordAnalysis,
    wordIndex,
    spellingSuggestions,
    handleSelectAnalysis,
  };
};

