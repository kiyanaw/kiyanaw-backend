const { processCharacters, FST_FILES } = require('../lib/special-processing-otwr')

describe('special-processing-otwr', () => {
  describe('processCharacters', () => {
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
    it('defines required FST files', () => {
      expect(FST_FILES).toHaveProperty('strict-analyzer')
      expect(FST_FILES).toHaveProperty('relaxed-analyzer')
    })

    it('uses correct file names', () => {
      expect(FST_FILES['strict-analyzer']).toBe('otwr_syncopated_analyzer.hfstol')
      expect(FST_FILES['relaxed-analyzer']).toBe('otwr_syncopated_analyzer_relaxed.hfstol')
    })

    it('does not have generator file', () => {
      expect(FST_FILES).not.toHaveProperty('strict-generator')
    })
  })
})

