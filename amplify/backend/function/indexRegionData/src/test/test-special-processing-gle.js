const { processCharacters, analyze } = require('../lib/special-processing-gle')

describe('special-processing-gle', () => {
  describe('processCharacters', () => {
    it('trims whitespace', () => {
      expect(processCharacters('  hello  ')).toBe('hello')
      expect(processCharacters('\tword\n')).toBe('word')
    })

    it('handles null and undefined', () => {
      expect(processCharacters(null)).toBe(null)
      expect(processCharacters(undefined)).toBe(undefined)
    })

    it('handles non-string input', () => {
      expect(processCharacters(123)).toBe(123)
    })

    it('returns empty string unchanged', () => {
      expect(processCharacters('')).toBe('')
    })
  })

  describe('analyze', () => {
    describe('nouns', () => {
      it('parses feminine nouns', () => {
        expect(analyze('cuid+Noun+Fem+Gen+Sg')).toEqual({
          lemma: 'cuid',
          wordType: 'N',
          wordClass: 'N'
        })

        expect(analyze('speir+Noun+Fem+Gen+Strong+Pl')).toEqual({
          lemma: 'speir',
          wordType: 'N',
          wordClass: 'N'
        })
      })

      it('parses masculine nouns', () => {
        expect(analyze('greim+Noun+Masc+Gen+Sg')).toEqual({
          lemma: 'greim',
          wordType: 'N',
          wordClass: 'N'
        })
      })

      it('parses nouns with definite article', () => {
        expect(analyze('tir+Noun+Fem+Com+Pl+DefArt')).toEqual({
          lemma: 'tir',
          wordType: 'N',
          wordClass: 'N'
        })
      })
    })

    describe('verbs', () => {
      it('parses transitive verbs', () => {
        expect(analyze('ceangail+Verb+VT+FutInd')).toEqual({
          lemma: 'ceangail',
          wordType: 'V',
          wordClass: 'VT'
        })
      })

      it('parses intransitive verbs', () => {
        expect(analyze('rith+Verb+VI+PresTense')).toEqual({
          lemma: 'rith',
          wordType: 'V',
          wordClass: 'VI'
        })
      })

      it('parses verbs without transitivity tag', () => {
        expect(analyze('ith+Verb+Tense')).toEqual({
          lemma: 'ith',
          wordType: 'V',
          wordClass: 'V'
        })
      })
    })

    describe('adjectives', () => {
      it('parses adjectives', () => {
        expect(analyze('fliuch+Adj+Fem+Gen+Sg')).toEqual({
          lemma: 'fliuch',
          wordType: 'Adj',
          wordClass: 'ADJ'
        })

        expect(analyze('mór+Adj+Masc+Com+Sg')).toEqual({
          lemma: 'mór',
          wordType: 'Adj',
          wordClass: 'ADJ'
        })
      })
    })

    describe('verbal nouns', () => {
      it('parses verbal nouns', () => {
        expect(analyze('feadail+Verbal+Noun+VI+Gen')).toEqual({
          lemma: 'feadail',
          wordType: 'Verbal',
          wordClass: 'VN'
        })

        expect(analyze('tioradh+Verbal+Noun+VT+Gen')).toEqual({
          lemma: 'tioradh',
          wordType: 'Verbal',
          wordClass: 'VN'
        })
      })
    })

    describe('edge cases', () => {
      it('handles empty or invalid input', () => {
        expect(analyze('')).toEqual({
          lemma: null,
          wordType: null,
          wordClass: null
        })

        expect(analyze(null)).toEqual({
          lemma: null,
          wordType: null,
          wordClass: null
        })

        expect(analyze(undefined)).toEqual({
          lemma: null,
          wordType: null,
          wordClass: null
        })
      })

      it('handles malformed analysis strings', () => {
        expect(analyze('just-a-word')).toEqual({
          lemma: 'just-a-word',
          wordType: null,
          wordClass: null
        })
      })
    })
  })
})
