const { processCharacters, FST_FILES } = require('../lib/special-processing-crgn')

describe('special-processing-crgn', () => {
  describe('processCharacters', () => {
    it('converts macron to circumflex', () => {
      expect(processCharacters('ā')).toBe('â')
      expect(processCharacters('ī')).toBe('î')
      expect(processCharacters('ō')).toBe('ô')
      expect(processCharacters('ē')).toBe('ê')
    })

    it('strips punctuation', () => {
      expect(processCharacters('hello,')).toBe('hello')
      expect(processCharacters('test.')).toBe('test')
      expect(processCharacters('word!')).toBe('word')
    })

    it('handles null and undefined', () => {
      expect(processCharacters(null)).toBe(null)
      expect(processCharacters(undefined)).toBe(undefined)
    })

    it('handles empty strings', () => {
      expect(processCharacters('')).toBe('')
      expect(processCharacters('   ')).toBe('')
    })
  })

  describe('FST_FILES', () => {
    it('defines all required FST files', () => {
      expect(FST_FILES).toHaveProperty('strict-analyzer')
      expect(FST_FILES).toHaveProperty('relaxed-analyzer')
      expect(FST_FILES).toHaveProperty('strict-generator')
    })

    it('uses CRK FST files (temporary)', () => {
      expect(FST_FILES['strict-analyzer']).toBe('crk-strict-analyzer.hfstol')
      expect(FST_FILES['relaxed-analyzer']).toBe('crk-relaxed-analyzer.hfstol')
      expect(FST_FILES['strict-generator']).toBe('crk-strict-generator.hfstol')
    })
  })
})

