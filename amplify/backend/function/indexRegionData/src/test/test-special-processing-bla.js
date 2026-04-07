const { processCharacters, analyze } = require('../lib/special-processing-bla')

describe('special-processing-bla', () => {
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
    describe('animate intransitive verbs (VAI)', () => {
      it('parses simple VAI verbs', () => {
        expect(analyze('waahkayi+VAI+Ind+3Sg')).toEqual({
          lemma: 'waahkayi',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses VAI verbs with Fut prefix', () => {
        expect(analyze('Fut+waahkayi+VAI+Ind+3Sg')).toEqual({
          lemma: 'waahkayi',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses VAI verbs with Past prefix', () => {
        expect(analyze('Past+waahkayi+VAI+Ind+3Sg')).toEqual({
          lemma: 'waahkayi',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses VAI verbs with multiple prefixes', () => {
        expect(analyze('Past+Neg+waahkayi+VAI+Ind+3Sg')).toEqual({
          lemma: 'waahkayi',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses VAI verbs with PV/ prefix', () => {
        expect(analyze('PV/oht+waahkayi+VAI+Ind+3Sg')).toEqual({
          lemma: 'waahkayi',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })
    })

    describe('inanimate intransitive verbs (VII)', () => {
      it('parses VII verbs', () => {
        expect(analyze('miistakistsi+VII+Ind+0Sg')).toEqual({
          lemma: 'miistakistsi',
          wordType: 'V',
          wordClass: 'VII'
        })
      })
    })

    describe('transitive animate verbs (VTA)', () => {
      it('parses VTA verbs', () => {
        expect(analyze('ino+VTA+Ind+1Sg+2SgO')).toEqual({
          lemma: 'ino',
          wordType: 'V',
          wordClass: 'VTA'
        })
      })

      it('parses VTA verbs with Past prefix', () => {
        expect(analyze('Past+ino+VTA+Ind+3Sg+1SgO')).toEqual({
          lemma: 'ino',
          wordType: 'V',
          wordClass: 'VTA'
        })
      })
    })

    describe('transitive inanimate verbs (VTI)', () => {
      it('parses VTI verbs', () => {
        expect(analyze('otaahkayi+VTI+Ind+1Sg')).toEqual({
          lemma: 'otaahkayi',
          wordType: 'V',
          wordClass: 'VTI'
        })
      })
    })

    describe('animate nouns (NA)', () => {
      it('parses animate nouns', () => {
        expect(analyze('ninaawa+NA+Sg')).toEqual({
          lemma: 'ninaawa',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('ninaawa+NA+Pl')).toEqual({
          lemma: 'ninaawa',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('ninaawa+NA+Obv')).toEqual({
          lemma: 'ninaawa',
          wordType: 'N',
          wordClass: 'NA'
        })
      })

      it('parses animate nouns with possessor', () => {
        expect(analyze('ninaawa+NA+Px1Sg+Sg')).toEqual({
          lemma: 'ninaawa',
          wordType: 'N',
          wordClass: 'NA'
        })
      })
    })

    describe('inanimate nouns (NI)', () => {
      it('parses inanimate nouns', () => {
        expect(analyze('miiini+NI+Sg')).toEqual({
          lemma: 'miiini',
          wordType: 'N',
          wordClass: 'NI'
        })

        expect(analyze('miiini+NI+Pl')).toEqual({
          lemma: 'miiini',
          wordType: 'N',
          wordClass: 'NI'
        })
      })

      it('parses inanimate nouns with PN/ prefix', () => {
        expect(analyze('PN/sa+miiini+NI+Sg')).toEqual({
          lemma: 'miiini',
          wordType: 'N',
          wordClass: 'NI'
        })
      })
    })

    describe('demonstratives (Dem)', () => {
      it('parses demonstratives', () => {
        expect(analyze('am+Dem+A+Sg+Stat')).toEqual({
          lemma: 'am',
          wordType: 'Dem',
          wordClass: 'DEM'
        })

        expect(analyze('am+Dem+I+Pl+Movg')).toEqual({
          lemma: 'am',
          wordType: 'Dem',
          wordClass: 'DEM'
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
