import { useMemo, useCallback } from 'react';
import { REGION_TEXT_MATCH_PATTERN } from '../constants/text-patterns';
import { useEditorStore } from '../stores/useEditorStore';
import { selectWordAnalysis } from '../use-cases/select-word-analysis';
import { type WordAnalysis, type SpellingSuggestion } from '../services/adt';

interface CursorAnalysisResult {
  cursorWord: string | null;
  cursorWordAnalysis: WordAnalysis | null;
  wordIndex: number | null;
  spellingSuggestions: SpellingSuggestion[];
}

const computeCursorAnalysis = (
  regionText: string,
  analyses: WordAnalysis[] | undefined,
  suggestions: SpellingSuggestion[] | undefined,
  cursorWord: { word: string; index: number } | null
): CursorAnalysisResult => {
  if (!cursorWord) {
    return { cursorWord: null, cursorWordAnalysis: null, wordIndex: null, spellingSuggestions: [] };
  }

  // Normalize cursor word once for all comparisons
  const normalizedCursorWord = cursorWord.word.toLowerCase();

  // Check if this word has spelling suggestions (misspelled word)
  const wordSuggestions = (suggestions || []).filter(
    s => s.word.toLowerCase() === normalizedCursorWord
  );
  
  if (wordSuggestions.length > 0) {
    // This is a misspelled word - return suggestions instead of analysis
    return {
      cursorWord: cursorWord.word,
      cursorWordAnalysis: null,
      wordIndex: null,
      spellingSuggestions: wordSuggestions,
    };
  }

  // No suggestions - check for analysis
  if (!analyses || analyses.length === 0) {
    return { cursorWord: null, cursorWordAnalysis: null, wordIndex: null, spellingSuggestions: [] };
  }
  const matchingAnalyses = analyses
    .map((analysis, index) => ({ analysis, index }))
    .filter(({ analysis }) => analysis.word.toLowerCase() === normalizedCursorWord);

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
    (position) => position.word === normalizedCursorWord
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

