import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import debounce from 'lodash.debounce';

// Import quill-cursors for collaborative editing
import QuillCursors from 'quill-cursors';
Quill.register('modules/cursors', QuillCursors);

// Simple approach: Register custom formats as CSS classes only for now
// This avoids the complex Quill format registration TypeScript issues
const customFormats = [
  'known-word',
  'ignore-word', 
  'issue-needs-help',
  'issue-indexing',
  'issue-new-word',
  'suggestion',
  'suggestion-known'
];

// Add CSS for custom formats
const customFormatStyles = `
  .known-word { color: #3b82f6; }
  .ignore-word { color: #777; }
  .issue-needs-help { background-color: #ffe6e6; }
  .issue-indexing { background-color: #fff9e6; }
  .issue-new-word { background-color: #e6f3ff; }
  .suggestion { text-decoration: underline; text-decoration-color: #f97316; }
  .suggestion-known { text-decoration: underline; text-decoration-color: #3b82f6; }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('quill-custom-formats')) {
  const style = document.createElement('style');
  style.id = 'quill-custom-formats';
  style.textContent = customFormatStyles;
  document.head.appendChild(style);
}

interface Region {
  id: string;
  start: number;
  end: number;
  displayIndex: number;
  text?: any; // Quill Delta format
  regionText?: string; // Plain text for display/search
  translation?: string;
  isNote?: boolean;
  issues?: any[];
}

interface RegionEditorProps {
  region: Region;
  canEdit: boolean;
  isTranscriptionAuthor?: boolean;
  transcription?: any;
  user?: any;
  onUpdate: (regionId: string, updates: Partial<Region>) => void;
  onPlay?: (start: number, end: number) => void;
  onToggleNote?: (regionId: string) => void;
  onCreateIssue?: (regionId: string, selectedText?: string, index?: number) => void;
  onDeleteRegion?: (regionId: string) => void;
  onShowCreateIssueForm?: () => void;
}

// Save state management
interface SaveState {
  DS_OUTBOX_BUSY: boolean;
  REGION_INTERMEDIARY: { id: string | null };
  SAVE_RETRY: number;
}

const saveState: SaveState = {
  DS_OUTBOX_BUSY: false,
  REGION_INTERMEDIARY: { id: null },
  SAVE_RETRY: 25
};

export const RegionEditor = memo(({
  region,
  canEdit,
  isTranscriptionAuthor = false,
  transcription,
  user,
  onUpdate,
  onPlay,
  onToggleNote,
  onCreateIssue,
  onDeleteRegion,
  onShowCreateIssueForm,
}: RegionEditorProps) => {
  const [activeTab, setActiveTab] = useState<'main' | 'translation'>('main');
  const [selectedRange, setSelectedRange] = useState<{ index: number; length: number; text: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mainEditorRef = useRef<ReactQuill>(null);
  const translationEditorRef = useRef<ReactQuill>(null);

  // Permissions
  const disableInputs = !transcription?.editors?.includes(user?.name);
  const canDelete = isTranscriptionAuthor && canEdit;

  // Configure Quill modules
  const mainEditorModules = useMemo(() => ({
    toolbar: false, // Custom toolbar
    cursors: {
      hideDelayMs: 5000,
      transformOnTextChange: true
    },
    clipboard: {
      matchVisual: false,
    },
  }), []);

  const translationEditorModules = useMemo(() => ({
    toolbar: false, // Custom toolbar
    clipboard: {
      matchVisual: false,
    },
  }), []);

  const mainEditorFormats = [
    'bold', 'italic', 'underline', 'color', 'background'
  ];

  const translationEditorFormats: string[] = []; // Plain text only

  // Save queue system with debouncing
  const debouncedSave = useCallback(
    debounce((regionId: string, updates: any) => {
      if (saveState.DS_OUTBOX_BUSY) {
        setTimeout(() => debouncedSave(regionId, updates), saveState.SAVE_RETRY);
      } else {
        // Strip suggestion formats before saving
        if (updates.text) {
          const cleanText = stripSuggestionFormats(updates.text);
          updates.text = cleanText;
        }
        onUpdate(regionId, updates);
      }
    }, 250),
    [onUpdate]
  );

  // Strip suggestion formats from Delta
  const stripSuggestionFormats = (delta: any) => {
    if (Array.isArray(delta)) {
      return delta.map(op => {
        if (op.attributes) {
          const cleanAttributes = { ...op.attributes };
          delete cleanAttributes.suggestion;
          delete cleanAttributes['suggestion-known'];
          if (Object.keys(cleanAttributes).length === 0) {
            return { insert: op.insert };
          }
          return { ...op, attributes: cleanAttributes };
        }
        return op;
      });
    }
    return delta;
  };

  // Reconcile text and issues - update issue indices when text changes
  const reconcileTextAndIssues = (newText: string, oldText: string, issues: any[]) => {
    if (!issues || issues.length === 0) return issues;
    
    // If text length hasn't changed significantly, keep issues as-is
    if (Math.abs(newText.length - oldText.length) < 2) {
      return issues;
    }

    // For now, we'll use a simple approach - remove issues if text changed dramatically
    // TODO: Implement more sophisticated text diff and issue position tracking
    const lengthChange = Math.abs(newText.length - oldText.length);
    const percentageChange = lengthChange / Math.max(oldText.length, 1);
    
    // If more than 50% of text changed, clear issues to avoid positioning errors
    if (percentageChange > 0.5) {
      console.warn('Text changed significantly, clearing issues to prevent positioning errors');
      return [];
    }

    // Otherwise keep issues but log warning about potential position drift
    if (lengthChange > 0) {
      console.warn('Text length changed, issue positions may need adjustment');
    }

    return issues;
  };

  // Handle main editor content changes
  const handleMainEditorChange = (_content: string, _delta: any, source: string, editor: any) => {
    if (source === 'user') {
      const deltaOps = editor.getContents().ops;
      const plainText = editor.getText();
      const oldText = region.regionText || '';
      
      // Reconcile issues with text changes
      const reconciledIssues = reconcileTextAndIssues(plainText.trim(), oldText, region.issues || []);
      
      debouncedSave(region.id, {
        text: deltaOps,
        regionText: plainText.trim(),
        ...(reconciledIssues.length !== (region.issues || []).length && { issues: reconciledIssues })
      });

      // Check for known words after content change
      checkForKnownWords(true);
    }
  };

  // Handle translation editor content changes  
  const handleTranslationChange = (_content: string, _delta: any, source: string, editor: any) => {
    if (source === 'user') {
      const plainText = editor.getText().trim();
      debouncedSave(region.id, { translation: plainText });
    }
  };

  // Handle selection changes for toolbar state
  const handleSelectionChange = (range: any, _source: string, editor: any) => {
    if (range && range.length > 0) {
      const text = editor.getText(range.index, range.length);
      setSelectedRange({
        index: range.index,
        length: range.length,
        text: text
      });

      // Check if selected text has suggestion formatting and show dropdown
      if (activeTab === 'main' && text.trim().length > 0) {
        const format = editor.getFormat(range.index, range.length);
        // Check for suggestion class in various possible format representations
        const hasSuggestion = format.class === 'suggestion' || 
                            (typeof format.class === 'string' && format.class.includes('suggestion')) ||
                            format.suggestion;
        if (hasSuggestion) {
          showSuggestionDropdown(text.trim(), { index: range.index, length: range.length });
        }
      }
    } else {
      setSelectedRange(null);
      hideSuggestionDropdown();
    }
  };

  // Toolbar actions
  const handlePlay = () => {
    if (onPlay) {
      setIsPlaying(true);
      onPlay(region.start, region.end);
      setTimeout(
        () => setIsPlaying(false),
        (region.end - region.start) * 1000 + 500
      );
    }
  };

  const handleToggleNote = () => {
    if (onToggleNote) {
      // Check if region has content
      const quill = mainEditorRef.current?.getEditor();
      if (quill) {
        const text = quill.getText().trim();
        if (text.length > 0) {
          alert('Cannot convert non-empty region to note!');
          return;
        }
      }
      onToggleNote(region.id);
    }
  };

  const handleCreateIssue = () => {
    if (selectedRange && onCreateIssue) {
      onCreateIssue(region.id, selectedRange.text, selectedRange.index);
    } else if (onShowCreateIssueForm) {
      onShowCreateIssueForm();
    }
  };

  const handleIgnoreWord = () => {
    if (selectedRange && activeTab === 'main') {
      const quill = mainEditorRef.current?.getEditor();
      if (quill) {
        quill.formatText(selectedRange.index, selectedRange.length, 'class', 'ignore-word');
      }
    }
  };

  const handleClearFormat = () => {
    if (selectedRange) {
      const quill = activeTab === 'main' 
        ? mainEditorRef.current?.getEditor()
        : translationEditorRef.current?.getEditor();
      
      if (quill) {
        // Clear all custom format classes
        customFormats.forEach(format => {
          quill.formatText(selectedRange.index, selectedRange.length, format, false);
        });
        quill.formatText(selectedRange.index, selectedRange.length, 'class', false);
      }
    }
  };

  const handleDeleteRegion = () => {
    if (onDeleteRegion && window.confirm('Are you sure you want to delete this region?')) {
      onDeleteRegion(region.id);
    }
  };

  // Initialize editor content when region changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mainEditorRef.current && region.text) {
        const quill = mainEditorRef.current.getEditor();
        if (Array.isArray(region.text)) {
          quill.setContents(region.text);
        } else {
          quill.setText(region.text);
        }
      }

      if (translationEditorRef.current && region.translation) {
        const quill = translationEditorRef.current.getEditor();
        quill.setText(region.translation);
      }
    }, 25); // Micro-delay as specified

    return () => clearTimeout(timer);
  }, [region.id, region.text, region.translation]);

  // Handle permissions
  useEffect(() => {
    if (mainEditorRef.current) {
      const quill = mainEditorRef.current.getEditor();
      disableInputs ? quill.disable() : quill.enable();
    }
    if (translationEditorRef.current) {
      const quill = translationEditorRef.current.getEditor();
      disableInputs ? quill.disable() : quill.enable();
    }
  }, [disableInputs]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  // State for text analysis
  const [checkTimer, setCheckTimer] = useState<NodeJS.Timeout | null>(null);
  const [knownWords, setKnownWords] = useState<string[]>([]);
  const [suggestionDropdown, setSuggestionDropdown] = useState<{
    visible: boolean;
    suggestions: string[];
    position: { top: number; left: number };
    range: { index: number; length: number };
    word: string;
  } | null>(null);
  
  // Extract words from Quill deltas for analysis
  const getTextMapFromDeltas = (deltas: any[]) => {
    const textMap: { [word: string]: { index: number; length: number; original: string } } = {};
    
    if (!Array.isArray(deltas)) return textMap;
    
    let currentIndex = 0;
    deltas.forEach((op: any) => {
      if (typeof op.insert === 'string') {
        const text = op.insert;
        // Extract words, handling special characters: [],.?() etc
        const words = text.match(/[a-zA-ZÀ-ÿ-]+/g) || [];
        
        words.forEach((word: string) => {
          const cleanWord = word.toLowerCase().trim();
          if (cleanWord.length > 1) { // Only check words longer than 1 character
            const wordIndex = text.indexOf(word, currentIndex);
            textMap[cleanWord] = {
              index: currentIndex + wordIndex,
              length: word.length,
              original: word
            };
          }
        });
        currentIndex += text.length;
      }
    });
    
    return textMap;
  };

  // Memoized text map for performance
  const textMap = useMemo(() => {
    return getTextMapFromDeltas(region.text || []);
  }, [region.text]);

  // Check for known words and apply formatting
  const checkForKnownWords = useCallback((doUpdate = false) => {
    if (transcription?.disableAnalyzer || region.isNote) return;
    
    if (checkTimer) {
      clearTimeout(checkTimer);
    }
    
    const timer = setTimeout(() => {
      const quill = mainEditorRef.current?.getEditor();
      if (!quill || !region.text) return;
      
      const words = Object.keys(textMap);
      const unknownWords = words.filter(w => !knownWords.includes(w));
      
      // Mock lexicon check for now - in real implementation this would call Lexicon.wordSearch
      // For now, we'll mark common English words as "known"
      const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
      const newKnownWords = [...knownWords];
      
      unknownWords.forEach((word: string) => {
        if (commonWords.includes(word.toLowerCase())) {
          newKnownWords.push(word);
        }
      });
      
      if (newKnownWords.length > knownWords.length) {
        setKnownWords(newKnownWords);
        if (doUpdate) {
          applyKnownWords();
          applySuggestions();
        }
      }
    }, 750); // 750ms delay as specified
    
    setCheckTimer(timer);
  }, [transcription?.disableAnalyzer, region.isNote, region.text, textMap, knownWords, checkTimer]);

  // Apply known word formatting
  const applyKnownWords = useCallback(() => {
    const quill = mainEditorRef.current?.getEditor();
    if (!quill || !region.text) return;
    
    Object.entries(textMap).forEach(([word, position]) => {
      if (knownWords.includes(word)) {
        // Use CSS class approach for now - simpler than complex Quill format registration
        const range = quill.getSelection();
        quill.formatText(position.index, position.length, 'class', 'known-word');
      }
    });
  }, [region.text, textMap, knownWords]);

  // Apply suggestion formatting to unknown words
  const applySuggestions = useCallback(() => {
    const quill = mainEditorRef.current?.getEditor();
    if (!quill || !region.text) return;
    
    Object.entries(textMap).forEach(([word, position]) => {
      if (!knownWords.includes(word) && word.length > 2) {
        // Mock suggestions - in real implementation this would come from Lexicon.getSuggestions()
        const mockSuggestions = [`${word}s`, `${word}ed`, `${word}ing`];
        if (mockSuggestions.length > 0) {
          quill.formatText(position.index, position.length, 'class', 'suggestion');
        }
      }
    });
  }, [region.text, textMap, knownWords]);

  // Show suggestion dropdown for a word
  const showSuggestionDropdown = useCallback((word: string, range: { index: number; length: number }) => {
    const quill = mainEditorRef.current?.getEditor();
    if (!quill) return;

    // Get cursor position for dropdown placement
    const bounds = quill.getBounds(range.index, range.length);
    if (!bounds) return;
    
    const editorRect = quill.container.getBoundingClientRect();
    
    // Mock suggestions - in real implementation this would come from Lexicon.getSuggestions()
    const mockSuggestions = [`${word}s`, `${word}ed`, `${word}ing`, word.toLowerCase(), word.toUpperCase()];
    
    setSuggestionDropdown({
      visible: true,
      suggestions: mockSuggestions,
      position: {
        top: bounds.bottom + editorRect.top + 5,
        left: bounds.left + editorRect.left
      },
      range,
      word
    });
  }, []);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    if (!suggestionDropdown) return;
    
    const quill = mainEditorRef.current?.getEditor();
    if (!quill) return;

    // Replace the word with the selected suggestion
    quill.deleteText(suggestionDropdown.range.index, suggestionDropdown.range.length);
    quill.insertText(suggestionDropdown.range.index, suggestion);
    
    // Clear suggestion formatting and hide dropdown
    setSuggestionDropdown(null);
  }, [suggestionDropdown]);

  // Hide suggestion dropdown
  const hideSuggestionDropdown = useCallback(() => {
    setSuggestionDropdown(null);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (checkTimer) {
        clearTimeout(checkTimer);
      }
    };
  }, [checkTimer]);

  // Cleanup on unmount - prevent memory leaks
  useEffect(() => {
    return () => {
      // Clear all timers
      if (checkTimer) {
        clearTimeout(checkTimer);
      }
      
      // Cancel any pending debounced saves
      debouncedSave.cancel();
      
      // Hide suggestion dropdown
      setSuggestionDropdown(null);
      
      // Clean up Quill instances if needed
      // Note: ReactQuill handles most cleanup automatically
    };
  }, [checkTimer, debouncedSave]);

  if (!region) {
    return (
      <div className="h-full flex items-center justify-center py-10 px-5">
        <div className="text-center text-gray-600">
          <h2 className="m-0 mb-2 text-lg font-medium text-gray-400">Please select a region</h2>
          <p className="m-0 text-sm leading-relaxed text-gray-300">Choose a region from the list to edit its content.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
      {/* Header with region info and toolbar */}
      <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200">
        <div>
          <h3 className="m-0 mb-1 text-lg font-semibold text-gray-800">Region #{region.displayIndex}</h3>
          <span className="text-sm text-gray-500 font-mono">
            {formatTime(region.start)} - {formatTime(region.end)}
          </span>
          {region.isNote && <span className="inline-block ml-2 py-0.5 px-2 bg-yellow-400 text-gray-800 rounded-xl text-xs font-medium">Note</span>}
        </div>

        {/* Custom Toolbar */}
        <div className="flex gap-2">
          <button
            className={`flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed ${
              isPlaying ? 'bg-green-600 text-white border-green-600' : ''
            }`}
            onClick={handlePlay}
            disabled={!onPlay}
            title="Play region"
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>

          {canEdit && (
            <>
              <button
                className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-cyan-600 hover:text-white hover:border-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleToggleNote}
                disabled={disableInputs}
                title={region.isNote ? 'Convert to transcription' : 'Convert to note'}
              >
                📝
              </button>

              <button
                className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-yellow-400 hover:text-gray-800 hover:border-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCreateIssue}
                disabled={disableInputs}
                title="Create issue"
              >
                ⚠️
              </button>

              <button
                className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-purple-600 hover:text-white hover:border-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleIgnoreWord}
                disabled={disableInputs || !selectedRange || activeTab !== 'main'}
                title="Ignore word"
              >
                👁️‍🗨️
              </button>

              <button
                className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-orange-500 hover:text-white hover:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleClearFormat}
                disabled={disableInputs || !selectedRange}
                title="Clear format"
              >
                🚫
              </button>

              {canDelete && (
                <button
                  className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-red-600 hover:text-white hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleDeleteRegion}
                  title="Delete region"
                >
                  🗑️
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-gray-100 border-b border-gray-300">
        <button
          className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
            activeTab === 'main'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('main')}
        >
          Original Text
        </button>
        <button
          className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
            activeTab === 'translation'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('translation')}
        >
          Translation
        </button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'main' && !region.isNote && (
          <div className="h-full">
            <ReactQuill
              ref={mainEditorRef}
              theme="snow"
              modules={mainEditorModules}
              formats={mainEditorFormats}
              onChange={handleMainEditorChange}
              onChangeSelection={handleSelectionChange}
              readOnly={disableInputs}
              placeholder="Enter original text..."
              style={{ height: '100%', backgroundColor: 'white' }}
            />
          </div>
        )}

        {activeTab === 'translation' && (
          <div className="h-full" style={{ backgroundColor: '#f5f5f5' }}>
            <ReactQuill
              ref={translationEditorRef}
              theme="snow"
              modules={translationEditorModules}
              formats={translationEditorFormats}
              onChange={handleTranslationChange}
              readOnly={disableInputs}
              placeholder="Enter translation..."
              style={{ height: '100%', backgroundColor: '#f5f5f5' }}
            />
          </div>
        )}

        {region.isNote && (
          <div className="h-full flex items-center justify-center p-4" style={{ backgroundColor: '#fcfaf0' }}>
            <div className="text-center text-gray-600">
              <h4 className="m-0 mb-2 text-md font-medium">Note Region</h4>
              <p className="m-0 text-sm">Notes only show translation content.</p>
            </div>
          </div>
        )}
      </div>

      {/* Issues Footer */}
      {region.issues && region.issues.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <h4 className="m-0 mb-2 text-sm font-semibold text-gray-700">Issues ({region.issues.length})</h4>
          <div className="flex flex-wrap gap-1.5">
            {region.issues.map((issue: any, index: number) => (
              <span
                key={index}
                className={`inline-block py-0.5 px-2 rounded-xl text-xs font-medium uppercase ${
                  issue.type === 'needs-help' ? 'bg-red-600 text-white' :
                  issue.type === 'indexing' ? 'bg-yellow-400 text-gray-800' :
                  issue.type === 'new-word' ? 'bg-cyan-600 text-white' :
                  'bg-gray-500 text-white'
                }`}
              >
                {issue.type || 'issue'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggestion Dropdown */}
      {suggestionDropdown && suggestionDropdown.visible && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded-md shadow-lg max-w-xs"
          style={{
            top: suggestionDropdown.position.top,
            left: suggestionDropdown.position.left
          }}
        >
          <div className="p-2">
            <div className="text-xs text-gray-500 mb-2">Suggestions for "{suggestionDropdown.word}":</div>
            {suggestionDropdown.suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="block w-full text-left px-2 py-1 text-sm hover:bg-blue-50 hover:text-blue-600 rounded transition-colors duration-150"
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                {suggestion}
              </button>
            ))}
            <button
              className="block w-full text-left px-2 py-1 text-xs text-gray-400 hover:bg-gray-50 rounded mt-1 border-t border-gray-200"
              onClick={hideSuggestionDropdown}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
