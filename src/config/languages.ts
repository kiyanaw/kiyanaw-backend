/**
 * Centralized language configuration
 * Add new languages here - they will automatically appear in dropdowns and validation
 */

export interface LanguageConfig {
  code: string;
  name: string;
}

const LANGUAGES_UNSORTED: readonly LanguageConfig[] = [
  { code: 'ciw', name: 'Anishnaabemowin (Ojibwe)' },
  { code: 'crgn', name: 'Michif (Northern)' },
  { code: 'crk', name: 'Nêhiyawêwin (Plains Cree Y-dialect)' },
  { code: 'otwc', name: 'Nishnaabemowin (Odawa - Corbiere)' },
  { code: 'otwr', name: 'Nishnaabemowin (Odawa - Rhodes)' },
] as const;

export const LANGUAGES: readonly LanguageConfig[] = [...LANGUAGES_UNSORTED].sort((a, b) => 
  a.name.localeCompare(b.name)
) as readonly LanguageConfig[];

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

