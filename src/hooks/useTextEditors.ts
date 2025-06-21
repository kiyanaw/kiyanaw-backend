import { useLayoutEffect, useEffect, useRef } from 'react';
import { rteService, type EditorKey } from '../services/rteService';
import { UpdateRegionTextUseCase } from '../use-cases/update-region-text';
import { AnalyzeRegionTextUseCase } from '../use-cases/analyze-region-text';
import { useEditorStore } from '../stores/useEditorStore';
import { services } from '../services';

export const useTextEditors = (regionId: string, activeTab: 'main' | 'translation') => {
  const mainEditorRef = useRef<HTMLDivElement>(null);
  const translationEditorRef = useRef<HTMLDivElement>(null);

  // Editor keys for rteService
  const mainEditorKey: EditorKey = `${regionId}:main`;
  const translationEditorKey: EditorKey = `${regionId}:translation`;

  // Get current region data from store
  const currentRegion = useEditorStore((state) => state.regionById(regionId));

  /**
   * MAIN EDITOR
   */
  useLayoutEffect(() => {
    if (!mainEditorRef.current || activeTab !== 'main') return;

    const config = {
      readonly: false,
      placeholder: "Enter original text..."
    };

    rteService.createOrGet(mainEditorKey, config);
    rteService.attach(mainEditorKey, mainEditorRef.current);

    // Populate with existing content (after editor is attached)
    if (currentRegion?.regionText) {
      rteService.setContent(mainEditorKey, currentRegion.regionText);
      
      // Apply known words formatting from cache immediately
      const knownWords = Array.from(useEditorStore.getState().knownWords);
      if (knownWords.length > 0) {
        rteService.applyKnownWordsFormatting(mainEditorKey, knownWords);
      }
    }

    // Set up text change listener
    rteService.onTextChange(mainEditorKey, (text) => {
      // Update region text
      new UpdateRegionTextUseCase({
        regionId,
        text,
        field: 'regionText',
        store: useEditorStore,
        services
      }).execute();

      // IMMEDIATELY apply cached known words formatting
      // This solves format inheritance and word splitting issues
      const knownWords = Array.from(useEditorStore.getState().knownWords);
      rteService.applyKnownWordsFormatting(mainEditorKey, knownWords);

      // Analyze text for known words (debounced, for API calls)
      new AnalyzeRegionTextUseCase({
        regionId,
        text,
        services,
        store: useEditorStore
      }).execute();
    });

    return () => {
      rteService.offTextChange(mainEditorKey);
      rteService.detach(mainEditorKey);
    };
  }, [mainEditorKey, activeTab]);

  /**
   * TRANSLATION EDITOR
   */
  useLayoutEffect(() => {
    if (!translationEditorRef.current || activeTab !== 'translation') return;

    const config = {
      readonly: false,
      placeholder: "Enter translation..."
    };

    rteService.createOrGet(translationEditorKey, config);
    rteService.attach(translationEditorKey, translationEditorRef.current);

    // Populate with existing translation content (after editor is attached)
    if (currentRegion?.translation) {
      rteService.setContent(translationEditorKey, currentRegion.translation);
    }

    // Set up text change listener for translation
    rteService.onTextChange(translationEditorKey, (text) => {
      new UpdateRegionTextUseCase({
        regionId,
        text,
        field: 'translation',
        store: useEditorStore,
        services
      }).execute();
    });

    return () => {
      rteService.offTextChange(translationEditorKey);
      rteService.detach(translationEditorKey);
    };
  }, [translationEditorKey, activeTab]);



  return {
    mainEditorRef,
    translationEditorRef,
    mainEditorKey,
    translationEditorKey
  };
}; 