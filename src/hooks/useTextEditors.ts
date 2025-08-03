import { useLayoutEffect, useRef } from 'react';
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

  // Get current region data and edit permissions from store
  const currentRegion = useEditorStore((state) => state.regionById(regionId));
  const canEdit = useEditorStore((state) => state.canEdit);

  /**
   * MAIN EDITOR
   * Note: We deliberately exclude currentRegion?.regionText from dependencies
   * to prevent editor recreation on every keystroke
   */
  useLayoutEffect(() => {
    if (!mainEditorRef.current || activeTab !== 'main') return;

    const config = {
      readonly: !canEdit,
      placeholder: canEdit ? "Enter original text..." : ""
    };

    rteService.createOrGet(mainEditorKey, config);
    rteService.attach(mainEditorKey, mainEditorRef.current);

    // Populate with existing content ONLY if editor doesn't already have content
    const currentContent = rteService.getInstance(mainEditorKey)?.getText().trim() || '';
    if (!currentContent && currentRegion?.regionText) {
      rteService.setContent(mainEditorKey, currentRegion.regionText);
      
      // Apply known words formatting from cache immediately
      const knownWords = Array.from(useEditorStore.getState().knownWords);
      if (knownWords.length > 0) {
        rteService.applyKnownWordsFormatting(mainEditorKey, knownWords);
      }
    }

    // Set up text change listener only if user can edit
    if (canEdit) {
      rteService.onTextChange(mainEditorKey, (text) => {
        // Update region text
        new UpdateRegionTextUseCase({
          regionId,
          text,
          field: 'regionText',
          store: useEditorStore.getState(),
          services
        }).execute();

        // IMMEDIATELY apply cached known words formatting
        // This solves format inheritance and word splitting issues
        const knownWords = Array.from(useEditorStore.getState().knownWords);
        rteService.applyKnownWordsFormatting(mainEditorKey, knownWords);

        // Analyze text for known words
        new AnalyzeRegionTextUseCase({
          regionId,
          text,
          services,
          store: useEditorStore.getState()
        }).execute();
      });
    }

    return () => {
      if (canEdit) {
        rteService.offTextChange(mainEditorKey);
      }
      rteService.detach(mainEditorKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainEditorKey, activeTab, canEdit, regionId]); // Deliberately excluding currentRegion to prevent focus loss

  /**
   * TRANSLATION EDITOR
   * Note: We deliberately exclude currentRegion?.translation from dependencies
   * to prevent editor recreation on every keystroke
   */
  useLayoutEffect(() => {
    if (!translationEditorRef.current || activeTab !== 'translation') return;

    const config = {
      readonly: !canEdit,
      placeholder: canEdit ? "Enter translation..." : ""
    };

    rteService.createOrGet(translationEditorKey, config);
    rteService.attach(translationEditorKey, translationEditorRef.current);

    // Populate with existing translation content ONLY if editor doesn't already have content
    const currentContent = rteService.getInstance(translationEditorKey)?.getText().trim() || '';
    if (!currentContent && currentRegion?.translation) {
      rteService.setContent(translationEditorKey, currentRegion.translation);
    }

    // Set up text change listener for translation only if user can edit
    if (canEdit) {
      rteService.onTextChange(translationEditorKey, (text) => {
        new UpdateRegionTextUseCase({
          regionId,
          text,
          field: 'translation',
          store: useEditorStore.getState(),
          services
        }).execute();
      });
    }

    return () => {
      if (canEdit) {
        rteService.offTextChange(translationEditorKey);
      }
      rteService.detach(translationEditorKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translationEditorKey, activeTab, canEdit, regionId]); // Deliberately excluding currentRegion to prevent focus loss

  return {
    mainEditorRef,
    translationEditorRef,
    mainEditorKey,
    translationEditorKey
  };
}; 