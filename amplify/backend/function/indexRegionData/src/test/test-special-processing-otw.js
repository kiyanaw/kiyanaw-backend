const { processCharacters, analyze } = require('../lib/special-processing-otw')

describe('special-processing-otw', () => {
  describe('processCharacters', () => {
    it('trims whitespace', () => {
      expect(processCharacters('  hello  ')).toBe('hello')
      expect(processCharacters('test')).toBe('test')
    })

    it('handles null and undefined', () => {
      expect(processCharacters(null)).toBe(null)
      expect(processCharacters(undefined)).toBe(undefined)
    })
  })

  describe('analyze', () => {
    describe('verbs (VII)', () => {
      it('parses simple VII verbs', () => {
        expect(analyze('mchaa+VII+0')).toEqual({
          lemma: 'mchaa',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('mchaa+VII+0+4')).toEqual({
          lemma: 'mchaa',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('mchaa+VII+0+Prt')).toEqual({
          lemma: 'mchaa',
          wordType: 'V',
          wordClass: 'VII'
        })
      })

      it('parses VII verbs with negative', () => {
        expect(analyze('mchaa+VII+Neg+0')).toEqual({
          lemma: 'mchaa',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('mchaa+VII+Neg+0+4')).toEqual({
          lemma: 'mchaa',
          wordType: 'V',
          wordClass: 'VII'
        })
      })
    })

    describe('verbs (VTA)', () => {
      it('parses simple VTA verbs', () => {
        expect(analyze('waabmaa+VTA+Imp+Imm+2+1')).toEqual({
          lemma: 'waabmaa',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('waabmaa+VTA+Imp+Imm+2+3')).toEqual({
          lemma: 'waabmaa',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('waabmaa+VTA+Imp+Del+2+1')).toEqual({
          lemma: 'waabmaa',
          wordType: 'V',
          wordClass: 'VTA'
        })
      })

      it('parses VTA verbs with negative', () => {
        expect(analyze('waabmaa+VTA+Imp+Neg+2+1')).toEqual({
          lemma: 'waabmaa',
          wordType: 'V',
          wordClass: 'VTA'
        })
      })
    })

    describe('verbs (VAI)', () => {
      it('parses simple VAI verbs', () => {
        expect(analyze('boodwe+VAI+Cnj+1')).toEqual({
          lemma: 'boodwe',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('boodwe+VAI+Cnj+2')).toEqual({
          lemma: 'boodwe',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('boodwe+VAI+Cnj+3')).toEqual({
          lemma: 'boodwe',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses VAI verbs with person prefixes', () => {
        expect(analyze('1+gwekshin+VAI')).toEqual({
          lemma: 'gwekshin',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('2+gwekshin+VAI')).toEqual({
          lemma: 'gwekshin',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('X+gwekshin+VAI')).toEqual({
          lemma: 'gwekshin',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses VAI verbs with tags after POS', () => {
        expect(analyze('gwekshin+VAI+3')).toEqual({
          lemma: 'gwekshin',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('gwekshin+VAI+X')).toEqual({
          lemma: 'gwekshin',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('gwekshin+VAI+3+Prt')).toEqual({
          lemma: 'gwekshin',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses VAI verbs with person prefix and tags', () => {
        expect(analyze('1+gwekshin+VAI+1+Pl')).toEqual({
          lemma: 'gwekshin',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('2+gwekshin+VAI+1+Pl')).toEqual({
          lemma: 'gwekshin',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('1+gwekshin+VAI+Prt')).toEqual({
          lemma: 'gwekshin',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses VAI verbs with negative', () => {
        expect(analyze('1+gwekshin+VAI+Neg')).toEqual({
          lemma: 'gwekshin',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('gwekshin+VAI+Neg+3')).toEqual({
          lemma: 'gwekshin',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses VAI conjunct verbs', () => {
        expect(analyze('boodwe+VAI+Cnj+1+Prt')).toEqual({
          lemma: 'boodwe',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('boodwe+VAI+Cnj+Neg+1')).toEqual({
          lemma: 'boodwe',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })
    })

    describe('nouns (NA)', () => {
      it('parses simple NA nouns', () => {
        expect(analyze('zhiishiip+NA')).toEqual({
          lemma: 'zhiishiip',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('jooweshk+NA')).toEqual({
          lemma: 'jooweshk',
          wordType: 'N',
          wordClass: 'NA'
        })
      })

      it('parses NA nouns with person prefixes', () => {
        expect(analyze('1+zhiishiip+NA')).toEqual({
          lemma: 'zhiishiip',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('2+zhiishiip+NA')).toEqual({
          lemma: 'zhiishiip',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('X+zhiishiip+NA')).toEqual({
          lemma: 'zhiishiip',
          wordType: 'N',
          wordClass: 'NA'
        })
      })

      it('parses NA nouns with tags', () => {
        expect(analyze('zhiishiip+NA+Con')).toEqual({
          lemma: 'zhiishiip',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('zhiishiip+NA+Dim')).toEqual({
          lemma: 'zhiishiip',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('zhiishiip+NA+Pej')).toEqual({
          lemma: 'zhiishiip',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('zhiishiip+NA+Prt')).toEqual({
          lemma: 'zhiishiip',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('zhiishiip+NA+Pl')).toEqual({
          lemma: 'zhiishiip',
          wordType: 'N',
          wordClass: 'NA'
        })
      })

      it('parses NA nouns with person prefix and tags', () => {
        expect(analyze('1+zhiishiip+NA+Con')).toEqual({
          lemma: 'zhiishiip',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('1+zhiishiip+NA+ThmPos')).toEqual({
          lemma: 'zhiishiip',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('1+zhiishiip+NA+1+Pl')).toEqual({
          lemma: 'zhiishiip',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('2+zhiishiip+NA+2+Pl')).toEqual({
          lemma: 'zhiishiip',
          wordType: 'N',
          wordClass: 'NA'
        })
      })

      it('parses complex NA noun forms', () => {
        expect(analyze('1+zhiishiip+NA+Con+ThmPos')).toEqual({
          lemma: 'zhiishiip',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('zhiishiip+NA+Con+Pej')).toEqual({
          lemma: 'zhiishiip',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('zhiishiip+NA+Con+Prt')).toEqual({
          lemma: 'zhiishiip',
          wordType: 'N',
          wordClass: 'NA'
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

      it('handles multiple person prefixes (should use first non-prefix)', () => {
        expect(analyze('1+2+3+lemma+VAI')).toEqual({
          lemma: 'lemma',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })
    })
  })
})

