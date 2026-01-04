import { useEditorStore } from '../stores/useEditorStore';
import { rteService } from '../services/rteService';
import { REGION_TEXT_MATCH_PATTERN } from '../constants/text-patterns';
import { UpdateRegionUseCase } from './update-region';
import { services } from '../services';

/**
 * Corrects a misspelled word in the editor by replacing it with a suggested correction
 * 
 * @param regionId - The ID of the region containing the word
 * @param misspelledWord - The misspelled word to replace
 * @param correctedWord - The corrected word to replace it with
 */
export async function correctSpelling(
  regionId: string,
  misspelledWord: string,
  correctedWord: string
): Promise<void> {
  const store = useEditorStore.getState();
  const region = store.regionById(regionId);
  
  if (!region) {
    throw new Error(`Region ${regionId} not found`);
  }

  const editorKey = `${regionId}:main` as const;
  const quill = rteService.getInstance(editorKey);
  
  if (!quill) {
    throw new Error(`Editor not found for region ${regionId}`);
  }

  // Get current text and cursor position
  const text = quill.getText();
  const selection = quill.getSelection();
  
  // Find the misspelled word at the cursor position
  const tokens = text.split(REGION_TEXT_MATCH_PATTERN);
  let charPos = 0;
  let wordStart = -1;
  let wordEnd = -1;
  
  for (const token of tokens) {
    if (REGION_TEXT_MATCH_PATTERN.test(token)) {
      const tokenLower = token.toLowerCase();
      const misspelledLower = misspelledWord.toLowerCase();
      
      // Check if this token matches the misspelled word and contains the cursor
      if (tokenLower === misspelledLower && 
          selection && 
          selection.index >= charPos && 
          selection.index <= charPos + token.length) {
        wordStart = charPos;
        wordEnd = charPos + token.length;
        break;
      }
    }
    charPos += token.length;
  }
  
  if (wordStart === -1 || wordEnd === -1) {
    console.warn('Could not find misspelled word at cursor position');
    return;
  }

  // Replace the word in the editor
  quill.deleteText(wordStart, wordEnd - wordStart, 'user');
  quill.insertText(wordStart, correctedWord, 'user');
  
  // Move cursor to end of corrected word
  quill.setSelection(wordStart + correctedWord.length, 0, 'user');
  
  // Get the updated text
  const updatedText = quill.getText();
  
  // Save the updated text using UpdateRegionUseCase
  const updateUseCase = new UpdateRegionUseCase({
    regionId,
    changes: { regionText: updatedText },
    debounceMs: 0, // Save immediately
    primaryField: 'regionText',
    pendingEditField: 'text',
    store: services.storeService,
    services,
  });
  
  await updateUseCase.execute();
}

