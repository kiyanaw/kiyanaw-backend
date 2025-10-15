import type { WordAnalysis } from './spellCheckerService';

/**
 * Migration service for handling backward compatibility between 
 * legacy string[] regionAnalysis and new WordAnalysis[] format
 */

/**
 * Migrate regionAnalysis from legacy string[] to new WordAnalysis[] format
 */
export const migrateRegionAnalysis = (
  regionAnalysis: string[] | WordAnalysis[] | undefined
): WordAnalysis[] => {
  console.log(`🔍 MIGRATE DEBUG - Input regionAnalysis:`, {
    type: typeof regionAnalysis,
    isArray: Array.isArray(regionAnalysis),
    length: regionAnalysis?.length,
    value: regionAnalysis
  });

  if (!regionAnalysis || regionAnalysis.length === 0) {
    console.log(`🔍 MIGRATE DEBUG - Empty or undefined analysis, returning empty array`);
    return [];
  }
  
  // Check if already migrated (has objects with 'word' property)
  if (typeof regionAnalysis[0] === 'object' && 'word' in regionAnalysis[0]) {
    return regionAnalysis as WordAnalysis[];
  }
  
  // Handle corrupted stringified objects (from GraphQL serialization issues)
  if (typeof regionAnalysis[0] === 'string' && 
      (regionAnalysis[0] as string).includes('{word=')) {
    console.log('🔧 Detected corrupted stringified WordAnalysis data, cleaning up...');
    
    // For corrupted data, extract only the clean words and treat as legacy
    const cleanWords: string[] = [];
    
    (regionAnalysis as string[]).forEach(str => {
      // Try to extract the first clean word from corrupted strings
      const firstWordMatch = str.match(/^([^{]+)$/) || // Clean word like "awiyak"
                            str.match(/word=([^,}]+)/);  // Extract from {word=awiyak,...}
      
      if (firstWordMatch && firstWordMatch[1] && 
          !firstWordMatch[1].includes('{') && 
          !firstWordMatch[1].includes('CACHED') && 
          !firstWordMatch[1].includes('LEGACY')) {
        cleanWords.push(firstWordMatch[1]);
      }
    });
    
    console.log(`🔧 Extracted ${cleanWords.length} clean words from corrupted data:`, cleanWords);
    
    // Return clean words as legacy format for re-analysis
    return cleanWords.map(word => ({
      word,
      analysis: '',
      allAnalysis: []
    }));
  }
  
  // Legacy format - convert strings to WordAnalysis objects
  return (regionAnalysis as string[]).map(word => ({
    word,
    analysis: '',
    allAnalysis: []
  }));
};

/**
 * Check if regionAnalysis needs re-analysis (contains legacy data)
 */
export const needsReanalysis = (analysis: WordAnalysis[]): boolean => {
  return analysis.some(item => item.analysis === '' || item.allAnalysis.length === 0);
};

/**
 * Extract just the words from regionAnalysis for backward compatibility
 * Used for highlighting and other operations that just need the word list
 */
export const extractWords = (analysis: string[] | WordAnalysis[] | undefined): string[] => {
  if (!analysis || analysis.length === 0) {
    return [];
  }
  
  // Handle new WordAnalysis format
  if (typeof analysis[0] === 'object' && 'word' in analysis[0]) {
    return (analysis as WordAnalysis[]).map(item => item.word);
  }
  
  // Handle legacy string format
  return analysis as string[];
};

/**
 * Check if regionAnalysis is in the new format
 */
export const isNewFormat = (analysis: string[] | WordAnalysis[] | undefined): analysis is WordAnalysis[] => {
  if (!analysis || analysis.length === 0) return false;
  
  // True new format - actual objects
  if (typeof analysis[0] === 'object' && 'word' in analysis[0]) {
    return true;
  }
  
  // Corrupted format - stringified objects (treat as needing migration)
  if (typeof analysis[0] === 'string' && (analysis[0] as string).startsWith('{word=')) {
    return false; // Needs migration to fix corruption
  }
  
  // Legacy string format
  return false;
};

/**
 * Convert WordAnalysis[] back to string[] for legacy compatibility
 * Used when saving to systems that expect the old format
 */
export const convertToLegacyFormat = (analysis: WordAnalysis[]): string[] => {
  return analysis.map(item => item.word);
};

/**
 * Merge new analysis results with existing analysis, preserving user selections
 * Only keeps words that are in the current text (wordsInText)
 */
export const mergeAnalysis = (
  existing: WordAnalysis[],
  newAnalysis: WordAnalysis[],
  wordsInText: string[]
): WordAnalysis[] => {
  const result: WordAnalysis[] = [];
  const existingMap = new Map(existing.map(item => [item.word, item]));
  const wordsInTextSet = new Set(wordsInText);
  
  // Process new analysis
  for (const newItem of newAnalysis) {
    const existingItem = existingMap.get(newItem.word);
    
    if (existingItem && existingItem.analysis !== 'LEGACY' && existingItem.analysis !== 'CACHED') {
      // Keep user's previous selection if it's still valid
      if (newItem.allAnalysis.includes(existingItem.analysis)) {
        result.push({
          ...newItem,
          analysis: existingItem.analysis // Preserve user selection
        });
      } else {
        // User's selection is no longer valid, use new default
        result.push(newItem);
      }
    } else {
      // New word or legacy data, use new analysis
      result.push(newItem);
    }
    
    existingMap.delete(newItem.word);
  }
  
  // Add remaining existing words ONLY if they're still in the current text
  for (const remainingItem of existingMap.values()) {
    if (wordsInTextSet.has(remainingItem.word)) {
      result.push(remainingItem);
    }
    // Otherwise, the word was deleted from the text and should be removed
  }
  
  return result;
};
