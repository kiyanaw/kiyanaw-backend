const { processCharacters, analyze } = require('../lib/special-processing-cwd')

describe('special-processing-cwd', () => {
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
  })

  describe('analyze', () => {
    describe('animate intransitive verbs (VAI)', () => {
      it('parses simple VAI verbs', () => {
        expect(analyze('nipaw+V+AI+Ind+3Sg')).toEqual({
          lemma: 'nipaw',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses VAI verbs with PV/ preverb', () => {
        expect(analyze('PV/i+nipaw+V+AI+Cnj+1Sg')).toEqual({
          lemma: 'nipaw',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses VAI verbs with IC (initial change)', () => {
        expect(analyze('IC+nipaw+V+AI+Cnj+3Sg')).toEqual({
          lemma: 'nipaw',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses VAI verbs with multiple preverbs', () => {
        expect(analyze('PV/i+PV/ki+nipaw+V+AI+Cnj+3Sg')).toEqual({
          lemma: 'nipaw',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses VAI verbs with reduplication', () => {
        expect(analyze('RdplW+nipaw+V+AI+Ind+3Pl')).toEqual({
          lemma: 'nipaw',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PV/i+RdplS+nipaw+V+AI+Cnj+3Sg')).toEqual({
          lemma: 'nipaw',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })
    })

    describe('inanimate intransitive verbs (VII)', () => {
      it('parses VII verbs', () => {
        expect(analyze('miskwaw+V+II+Ind+3Sg')).toEqual({
          lemma: 'miskwaw',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('PV/i+miskwaw+V+II+Cnj+4Sg')).toEqual({
          lemma: 'miskwaw',
          wordType: 'V',
          wordClass: 'VII'
        })
      })
    })

    describe('transitive animate verbs (VTA)', () => {
      it('parses VTA verbs', () => {
        expect(analyze('wicihiw+V+TA+Ind+1Sg+3SgO')).toEqual({
          lemma: 'wicihiw',
          wordType: 'V',
          wordClass: 'VTA'
        })
      })

      it('parses VTA verbs with imperative', () => {
        expect(analyze('wicihiw+V+TA+Imp+Imm+2Sg+3SgO')).toEqual({
          lemma: 'wicihiw',
          wordType: 'V',
          wordClass: 'VTA'
        })
      })
    })

    describe('transitive inanimate verbs (VTI)', () => {
      it('parses VTI verbs', () => {
        expect(analyze('atoskâtam+V+TI+Ind+1Sg')).toEqual({
          lemma: 'atoskâtam',
          wordType: 'V',
          wordClass: 'VTI'
        })

        expect(analyze('PV/i+atoskâtam+V+TI+Cnj+3Sg')).toEqual({
          lemma: 'atoskâtam',
          wordType: 'V',
          wordClass: 'VTI'
        })
      })
    })

    describe('animate nouns (NA)', () => {
      it('parses animate nouns', () => {
        expect(analyze('pahkwisikan+N+A+Sg')).toEqual({
          lemma: 'pahkwisikan',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('pahkwisikan+N+A+Pl')).toEqual({
          lemma: 'pahkwisikan',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('pahkwisikan+N+A+Obv')).toEqual({
          lemma: 'pahkwisikan',
          wordType: 'N',
          wordClass: 'NA'
        })
      })

      it('parses animate nouns with possessor', () => {
        expect(analyze('pahkwisikan+N+A+Px1Sg+Sg')).toEqual({
          lemma: 'pahkwisikan',
          wordType: 'N',
          wordClass: 'NA'
        })
      })

      it('parses dependent animate nouns (D tag)', () => {
        expect(analyze('nîstâw+N+A+D+Px2Sg+Obv')).toEqual({
          lemma: 'nîstâw',
          wordType: 'N',
          wordClass: 'NA'
        })
      })
    })

    describe('inanimate nouns (NI)', () => {
      it('parses inanimate nouns', () => {
        expect(analyze('ciman+N+I+Sg')).toEqual({
          lemma: 'ciman',
          wordType: 'N',
          wordClass: 'NI'
        })

        expect(analyze('ciman+N+I+Loc')).toEqual({
          lemma: 'ciman',
          wordType: 'N',
          wordClass: 'NI'
        })
      })

      it('parses inanimate nouns with possessor', () => {
        expect(analyze('ciman+N+I+Px3Pl+Pl')).toEqual({
          lemma: 'ciman',
          wordType: 'N',
          wordClass: 'NI'
        })
      })
    })

    describe('particles (Ipc)', () => {
      it('parses particles', () => {
        expect(analyze('êkây+Ipc')).toEqual({
          lemma: 'êkây',
          wordType: 'Ipc',
          wordClass: 'IPC'
        })
      })
    })

    describe('pronouns (Pron)', () => {
      it('parses pronouns', () => {
        expect(analyze('awiyak+Pron+Indef+A+Sg')).toEqual({
          lemma: 'awiyak',
          wordType: 'Pron',
          wordClass: 'PRON'
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
