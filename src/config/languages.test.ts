import { LANGUAGES, LANGUAGE_CODES, getLanguageName, isValidLanguageCode } from './languages';

describe('languages config', () => {
  describe('LANGUAGES', () => {
    it('contains language configurations', () => {
      expect(LANGUAGES.length).toBeGreaterThan(0);
      
      LANGUAGES.forEach((lang) => {
        expect(lang).toHaveProperty('code');
        expect(lang).toHaveProperty('name');
        expect(typeof lang.code).toBe('string');
        expect(typeof lang.name).toBe('string');
      });
    });

    it('has unique language codes', () => {
      const codes = LANGUAGES.map(l => l.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe('LANGUAGE_CODES', () => {
    it('contains all language codes', () => {
      expect(LANGUAGE_CODES).toEqual(LANGUAGES.map(l => l.code));
    });

    it('includes expected languages', () => {
      expect(LANGUAGE_CODES).toContain('crk');
      expect(LANGUAGE_CODES).toContain('crgn');
      expect(LANGUAGE_CODES).toContain('otwc');
      expect(LANGUAGE_CODES).toContain('otwr');
      expect(LANGUAGE_CODES).toContain('ciw');
    });
  });

  describe('getLanguageName', () => {
    it('returns the correct language name for valid code', () => {
      expect(getLanguageName('crk')).toBe('Plains Cree Y-dialect');
      expect(getLanguageName('crgn')).toBe('Northern Michif');
      expect(getLanguageName('otwc')).toBe('Nishnaabemwin (Corbiere-style)');
      expect(getLanguageName('otwr')).toBe('Nishnaabemwin (Rhodes-style)');
      expect(getLanguageName('ciw')).toBe('Nishnaabemowin (Ojibwe)');
    });

    it('returns the code itself for unknown language', () => {
      expect(getLanguageName('unknown')).toBe('unknown');
      expect(getLanguageName('xyz')).toBe('xyz');
    });
  });

  describe('isValidLanguageCode', () => {
    it('returns true for valid language codes', () => {
      expect(isValidLanguageCode('crk')).toBe(true);
      expect(isValidLanguageCode('crgn')).toBe(true);
      expect(isValidLanguageCode('otwc')).toBe(true);
      expect(isValidLanguageCode('otwr')).toBe(true);
      expect(isValidLanguageCode('ciw')).toBe(true);
    });

    it('returns false for invalid language codes', () => {
      expect(isValidLanguageCode('unknown')).toBe(false);
      expect(isValidLanguageCode('xyz')).toBe(false);
      expect(isValidLanguageCode('')).toBe(false);
    });
  });
});

