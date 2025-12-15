/**
 * Centralized language configuration
 * Add new languages here - they will automatically appear in dropdowns and validation
 */

export interface LanguageConfig {
  code: string;
  name: string;
}

export const LANGUAGES: readonly LanguageConfig[] = [
  { code: 'crk', name: 'Nêhiyawêwin (Plains Cree Y-dialect)' },
  { code: 'crgn', name: 'Michif (Northern)' },
  { code: 'otwc', name: 'Nishnaabemowin (Odawa - Corbiere)' },
  { code: 'otwr', name: 'Nishnaabemowin (Odawa - Rhodes)' },
  { code: 'ciw', name: 'Anishnaabemowin (Ojibwe)' },
] as const;

/**
 * Helper to get all language codes
 */
export const LANGUAGE_CODES = LANGUAGES.map(l => l.code);

/**
 * Helper to get language name by code
 */
export const getLanguageName = (code: string): string => {
  const language = LANGUAGES.find(l => l.code === code);
  return language?.name || code;
};

/**
 * Helper to validate if a language code is supported
 */
export const isValidLanguageCode = (code: string): boolean => {
  return LANGUAGE_CODES.includes(code);
};

