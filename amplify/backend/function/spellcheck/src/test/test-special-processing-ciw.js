const { processCharacters, FST_FILES } = require('../lib/special-processing-ciw')

describe('special-processing-ciw', () => {
  describe('FST_FILES', () => {
    it('exports FST_FILES object', () => {
      expect(FST_FILES).toBeDefined()
      expect(typeof FST_FILES).toBe('object')
    })

    it('has strict-analyzer file', () => {
      expect(FST_FILES).toHaveProperty('strict-analyzer')
      expect(FST_FILES['strict-analyzer']).toBe('ciw-strict-analyzer.hfstol')
    })

    it('does not have relaxed-analyzer or generator files', () => {
      expect(FST_FILES).not.toHaveProperty('relaxed-analyzer')
      expect(FST_FILES).not.toHaveProperty('strict-generator')
    })
  })

  describe('processCharacters', () => {
    it('strips punctuation from text', () => {
      expect(processCharacters('hello, world!')).toBe('hello world')
      expect(processCharacters('test.')).toBe('test')
      expect(processCharacters('word;')).toBe('word')
    })

    it('trims whitespace', () => {
      expect(processCharacters('  word  ')).toBe('word')
      expect(processCharacters('\tword\n')).toBe('word')
    })

    it('handles empty strings', () => {
      expect(processCharacters('')).toBe('')
    })

    it('handles null and undefined', () => {
      expect(processCharacters(null)).toBe(null)
      expect(processCharacters(undefined)).toBe(undefined)
    })

    it('handles text without punctuation', () => {
      expect(processCharacters('hello world')).toBe('hello world')
    })
  })
})

