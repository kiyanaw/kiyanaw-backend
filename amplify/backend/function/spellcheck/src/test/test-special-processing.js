const { getLanguageProcessor, hasSpecialProcessing, languages } = require('../lib/special-processing')

describe('special-processing', () => {
  describe('getLanguageProcessor', () => {
    it('returns processor for crk', () => {
      const processor = getLanguageProcessor('crk')
      expect(processor).toBeDefined()
      expect(processor.processCharacters).toBeDefined()
      expect(processor.FST_FILES).toBeDefined()
    })

    it('returns processor for crgn', () => {
      const processor = getLanguageProcessor('crgn')
      expect(processor).toBeDefined()
      expect(processor.processCharacters).toBeDefined()
      expect(processor.FST_FILES).toBeDefined()
    })

    it('returns processor for otwc', () => {
      const processor = getLanguageProcessor('otwc')
      expect(processor).toBeDefined()
      expect(processor.processCharacters).toBeDefined()
      expect(processor.FST_FILES).toBeDefined()
    })

    it('returns processor for otwr', () => {
      const processor = getLanguageProcessor('otwr')
      expect(processor).toBeDefined()
      expect(processor.processCharacters).toBeDefined()
      expect(processor.FST_FILES).toBeDefined()
    })

    it('returns processor for ciw', () => {
      const processor = getLanguageProcessor('ciw')
      expect(processor).toBeDefined()
      expect(processor.processCharacters).toBeDefined()
      expect(processor.FST_FILES).toBeDefined()
    })

    it('returns null for unsupported language', () => {
      expect(getLanguageProcessor('xyz')).toBeNull()
      expect(getLanguageProcessor('en')).toBeNull()
    })

    it('returns null for invalid input', () => {
      expect(getLanguageProcessor(null)).toBeNull()
      expect(getLanguageProcessor(undefined)).toBeNull()
      expect(getLanguageProcessor('')).toBeNull()
      expect(getLanguageProcessor(123)).toBeNull()
    })
  })

  describe('hasSpecialProcessing', () => {
    it('returns true for supported languages', () => {
      expect(hasSpecialProcessing('crk')).toBe(true)
      expect(hasSpecialProcessing('crgn')).toBe(true)
      expect(hasSpecialProcessing('otwc')).toBe(true)
      expect(hasSpecialProcessing('otwr')).toBe(true)
      expect(hasSpecialProcessing('ciw')).toBe(true)
    })

    it('returns false for unsupported languages', () => {
      expect(hasSpecialProcessing('xyz')).toBe(false)
      expect(hasSpecialProcessing('en')).toBe(false)
    })
  })

  describe('languages registry', () => {
    it('exports languages object', () => {
      expect(languages).toBeDefined()
      expect(typeof languages).toBe('object')
    })

    it('includes all supported languages', () => {
      expect(languages).toHaveProperty('crk')
      expect(languages).toHaveProperty('crgn')
      expect(languages).toHaveProperty('otwc')
      expect(languages).toHaveProperty('otwr')
      expect(languages).toHaveProperty('ciw')
    })
  })
})

