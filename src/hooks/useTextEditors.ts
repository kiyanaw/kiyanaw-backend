import { useLayoutEffect, useRef } from 'react';
import { rteService, type EditorKey } from '../services/rteService';
import { issueHighlightService } from '../services/issueHighlightService';
import { UpdateRegionTextUseCase } from '../use-cases/update-region-text';
import { UpdateIssueTextUseCase } from '../use-cases/update-issue-text';
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
      
      // Apply highlighting and run issue matching detection
      const state = useEditorStore.getState();
      const knownWords = Array.from(state.knownWords);
      
      // Use updateIssueHighlighting which includes matching service detection
      if (typeof rteService.updateIssueHighlighting === 'function') {
        rteService.updateIssueHighlighting(regionId);
      } else {
        // Fallback to old method if updateIssueHighlighting doesn't exist
        const issues = typeof state.getIssuesForRegion === 'function' 
          ? state.getIssuesForRegion(regionId) 
          : [];
        const issueHighlights = issueHighlightService.convertIssuesToHighlights(issues);
        
        if (typeof rteService.applyHighlighting === 'function') {
          rteService.applyHighlighting(mainEditorKey, {
            knownWords,
            issues: issueHighlights
          });
        } else {
          rteService.applyKnownWordsFormatting(mainEditorKey, knownWords);
        }
      }
    }

    // Set up text change listener only if user can edit
    if (canEdit) {
      // Track text selection changes
      rteService.onSelectionChange(mainEditorKey, (range) => {
        const store = useEditorStore.getState();
        if (range && range.length > 0) {
          const selectedText = rteService.getSelectedText(mainEditorKey);
          if (selectedText && selectedText.trim().length > 0) {
            store.setRegionSelection(regionId, {
              index: range.index,
              length: range.length,
              text: selectedText
            });
          } else {
            store.setRegionSelection(regionId, null);
          }
        } else {
          store.setRegionSelection(regionId, null);
        }
      });

      rteService.onTextChange(mainEditorKey, (text) => {
        // Check if we're typing inside an issue and handle issue text updates
        const selectionIndex = rteService.getSelection(mainEditorKey);
        if (selectionIndex !== null) {
          const issueContext = rteService.getIssueContext(mainEditorKey, selectionIndex);
          if (issueContext.issueId) {
            // We're typing inside an issue - get the current word/token
            const currentWord = rteService.getWordAt(mainEditorKey, selectionIndex);
            if (currentWord) {
              // Update the issue text in the store immediately to maintain highlighting
              new UpdateIssueTextUseCase().execute({
                issueId: issueContext.issueId,
                newText: currentWord
              }).catch(error => {
                console.error('Failed to update issue text:', error);
              });
            }
          }
        }

        // Track pending edit (start if first change, update activity if ongoing)
        if (!services.storeService.isPendingEdit(regionId, 'regionText')) {
          // Start new pending edit
          services.storeService.startPendingEdit(regionId, 'regionText');
          console.log('🟡 Started pending edit for region:', regionId, 'field: regionText');
        } else {
          // Update existing pending edit activity
          services.storeService.updatePendingEditActivity(regionId, 'regionText');
        }

        // Update region text
        new UpdateRegionTextUseCase({
          regionId,
          text,
          field: 'regionText',
          store: useEditorStore.getState(),
          services
        }).execute();

        // IMMEDIATELY apply highlighting and run issue matching detection
        // This solves format inheritance and word splitting issues
        const state = useEditorStore.getState();
        const knownWords = Array.from(state.knownWords);
        
        // Use updateIssueHighlighting which includes matching service detection
        if (typeof rteService.updateIssueHighlighting === 'function') {
          rteService.updateIssueHighlighting(regionId);
        } else {
          // Fallback to old method if updateIssueHighlighting doesn't exist
          const issues = typeof state.getIssuesForRegion === 'function' 
            ? state.getIssuesForRegion(regionId) 
            : [];
          const issueHighlights = issueHighlightService.convertIssuesToHighlights(issues);
          
          if (typeof rteService.applyHighlighting === 'function') {
            rteService.applyHighlighting(mainEditorKey, {
              knownWords,
              issues: issueHighlights
            });
          } else {
            rteService.applyKnownWordsFormatting(mainEditorKey, knownWords);
          }
        }

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
        rteService.offSelectionChange(mainEditorKey);
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
        // Track pending edit (start if first change, update activity if ongoing)
        if (!services.storeService.isPendingEdit(regionId, 'translation')) {
          // Start new pending edit
          services.storeService.startPendingEdit(regionId, 'translation');
          console.log('🟡 Started pending edit for region:', regionId, 'field: translation');
        } else {
          // Update existing pending edit activity
          services.storeService.updatePendingEditActivity(regionId, 'translation');
        }

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