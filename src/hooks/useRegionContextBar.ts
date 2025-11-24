import { useMemo, useCallback } from 'react';
import { REGION_TEXT_MATCH_PATTERN } from '../constants/text-patterns';
import { useEditorStore } from '../stores/useEditorStore';
import { selectWordAnalysis } from '../use-cases/select-word-analysis';
import { type WordAnalysis } from '../services/adt';

interface CursorAnalysisResult {
  cursorWord: string | null;
  cursorWordAnalysis: WordAnalysis | null;
  wordIndex: number | null;
}

const computeCursorAnalysis = (
  regionText: string,
  analyses: WordAnalysis[] | undefined,
  cursorWord: { word: string; index: number } | null
): CursorAnalysisResult => {
  if (!cursorWord || !analyses || analyses.length === 0) {
    return { cursorWord: null, cursorWordAnalysis: null, wordIndex: null };
  }

  const normalizedCursorWord = cursorWord.word.toLowerCase();
  const matchingAnalyses = analyses
    .map((analysis, index) => ({ analysis, index }))
    .filter(({ analysis }) => analysis.word.toLowerCase() === normalizedCursorWord);

  if (matchingAnalyses.length === 0) {
    return { cursorWord: null, cursorWordAnalysis: null, wordIndex: null };
  }

  if (matchingAnalyses.length === 1) {
    return {
      cursorWord: cursorWord.word,
      cursorWordAnalysis: matchingAnalyses[0].analysis,
      wordIndex: matchingAnalyses[0].index,
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
  };
};

export const useRegionContextBar = (regionId: string, canEdit: boolean) => {
  const region = useEditorStore((state) => state.regionById(regionId));
  const cursorWordInfo = useEditorStore(
    (state) => state.regionCursorWords?.[regionId] ?? null
  );

  const { cursorWord, cursorWordAnalysis, wordIndex } = useMemo(
    () =>
      computeCursorAnalysis(
        region?.text || region?.regionText || '',
        region?.regionAnalysis,
        cursorWordInfo
      ),
    [region?.regionAnalysis, region?.regionText, region?.text, cursorWordInfo]
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
    handleSelectAnalysis,
  };
};

