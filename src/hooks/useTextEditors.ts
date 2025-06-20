import { useLayoutEffect, useRef } from 'react';
import { rteService, type EditorKey } from '../services/rteService';

export const useTextEditors = (regionId: string, activeTab: 'main' | 'translation') => {
  const mainEditorRef = useRef<HTMLDivElement>(null);
  const translationEditorRef = useRef<HTMLDivElement>(null);

  // Editor keys for rteService
  const mainEditorKey: EditorKey = `${regionId}:main`;
  const translationEditorKey: EditorKey = `${regionId}:translation`;

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

    return () => {
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

    return () => {
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