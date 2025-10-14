const { processCharacters, analyze } = require('../lib/special-processing-crk')

describe('special-processing-crk', () => {
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
    describe('particles (Ipc)', () => {
      it('parses simple particles', () => {
        expect(analyze('â+Ipc+Interj')).toEqual({
          lemma: 'â',
          wordType: 'Ipc',
          wordClass: 'Ipc'
        })

        expect(analyze('âhâ+Ipc+Interj')).toEqual({
          lemma: 'âhâ',
          wordType: 'Ipc',
          wordClass: 'Ipc'
        })

        expect(analyze('ahpô+Ipc')).toEqual({
          lemma: 'ahpô',
          wordType: 'Ipc',
          wordClass: 'Ipc'
        })
      })

      it('parses particles without additional tags', () => {
        expect(analyze('anima+Ipc')).toEqual({
          lemma: 'anima',
          wordType: 'Ipc',
          wordClass: 'Ipc'
        })

        expect(analyze('êkây+Ipc')).toEqual({
          lemma: 'êkây',
          wordType: 'Ipc',
          wordClass: 'Ipc'
        })
      })
    })

    describe('animate nouns (NA)', () => {
      it('parses animate nouns', () => {
        expect(analyze('ahcahk+N+A+Sg')).toEqual({
          lemma: 'ahcahk',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('âhâsiw+N+A+Sg')).toEqual({
          lemma: 'âhâsiw',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('awâsis+N+A+Obv')).toEqual({
          lemma: 'awâsis',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('nêhiyaw+N+A+Sg')).toEqual({
          lemma: 'nêhiyaw',
          wordType: 'N',
          wordClass: 'NA'
        })
      })

      it('parses animate nouns with possessive', () => {
        expect(analyze('wâhkômâkan+N+A+Px2Sg+Pl')).toEqual({
          lemma: 'wâhkômâkan',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('nôsisim+N+A+D+Px2Sg+Sg')).toEqual({
          lemma: 'nôsisim',
          wordType: 'N',
          wordClass: 'NA'
        })
      })
    })

    describe('inanimate nouns (NI)', () => {
      it('parses inanimate nouns', () => {
        expect(analyze('apasoy+N+I+Sg')).toEqual({
          lemma: 'apasoy',
          wordType: 'N',
          wordClass: 'NI'
        })

        expect(analyze('mihti+N+I+Sg')).toEqual({
          lemma: 'mihti',
          wordType: 'N',
          wordClass: 'NI'
        })

        expect(analyze('mîkiwâhp+N+I+Sg')).toEqual({
          lemma: 'mîkiwâhp',
          wordType: 'N',
          wordClass: 'NI'
        })
      })

      it('parses inanimate nouns with locative', () => {
        expect(analyze('akâmaskiy+N+I+Loc')).toEqual({
          lemma: 'akâmaskiy',
          wordType: 'N',
          wordClass: 'NI'
        })

        expect(analyze('ôcênâs+N+I+Loc')).toEqual({
          lemma: 'ôcênâs',
          wordType: 'N',
          wordClass: 'NI'
        })
      })
    })

    describe('animate intransitive verbs (VAI)', () => {
      it('parses VAI verbs', () => {
        expect(analyze('âhkamêyimow+V+AI+Ind+1Sg')).toEqual({
          lemma: 'âhkamêyimow',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PV/e+awasêwêw+V+AI+Cnj+3Sg')).toEqual({
          lemma: 'awasêwêw',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('IC+nahîw+V+AI+Cnj+3Sg')).toEqual({
          lemma: 'nahîw',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses VAI verbs with preverbs', () => {
        expect(analyze('PV/ati+ohpîw+V+AI+Imp+Imm+2Sg')).toEqual({
          lemma: 'ohpîw',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PV/e+PV/ki+manîw+V+AI+Cnj+3Sg')).toEqual({
          lemma: 'manîw',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PV/e+PV/wi+isîhcikêw+V+AI+Cnj+3Pl')).toEqual({
          lemma: 'isîhcikêw',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses VAI verbs with multiple preverbs', () => {
        expect(analyze('PV/e+PV/ki+PV/nihta+kâsôw+V+AI+Cnj+3Pl')).toEqual({
          lemma: 'kâsôw',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PV/e+PV/ki+PV/pimi+itinikêw+V+AI+Cnj+3Sg')).toEqual({
          lemma: 'itinikêw',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses VAI verbs with reduplication', () => {
        expect(analyze('PV/e+RdplW+papâmipahtâw+V+AI+Cnj+3Pl')).toEqual({
          lemma: 'papâmipahtâw',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('RdplW+kaskihtâw+V+TI+Imp+Imm+2Sg')).toEqual({
          lemma: 'kaskihtâw',
          wordType: 'V',
          wordClass: 'VTI'
        })
      })
    })

    describe('inanimate intransitive verbs (VII)', () => {
      it('parses VII verbs', () => {
        expect(analyze('PV/e+ispahcâw+V+II+Cnj+4Sg')).toEqual({
          lemma: 'ispahcâw',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('PV/kaa+ohpîw+V+II+Cnj+3Pl')).toEqual({
          lemma: 'ohpîw',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('PV/e+PV/ati+wâpan+V+II+Cnj+4Sg')).toEqual({
          lemma: 'wâpan',
          wordType: 'V',
          wordClass: 'VII'
        })
      })
    })

    describe('transitive animate verbs (VTA)', () => {
      it('parses VTA verbs', () => {
        expect(analyze('ahêw+V+TA+Ind+3Sg+1SgO')).toEqual({
          lemma: 'ahêw',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('IC+PV/ako+ayâwêw+V+TA+Cnj+X+3PlO')).toEqual({
          lemma: 'ayâwêw',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('PV/e+nôtinêw+V+TA+Cnj+3Sg+1SgO')).toEqual({
          lemma: 'nôtinêw',
          wordType: 'V',
          wordClass: 'VTA'
        })
      })

      it('parses VTA verbs with preverbs', () => {
        expect(analyze('PV/e+PV/ki+osâpamêw+V+TA+Cnj+2Sg+3PlO')).toEqual({
          lemma: 'osâpamêw',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('PV/kaa+PV/ki+âsônamawêw+V+TA+Cnj+X+3PlO')).toEqual({
          lemma: 'âsônamawêw',
          wordType: 'V',
          wordClass: 'VTA'
        })
      })

      it('parses VTA verbs with reduplication', () => {
        expect(analyze('RdplW+kakwêcimêw+V+TA+Imp+Imm+2Pl+3PlO')).toEqual({
          lemma: 'kakwêcimêw',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('RdplW+kâtêw+V+TA+Imp+Imm+2Sg+3PlO')).toEqual({
          lemma: 'kâtêw',
          wordType: 'V',
          wordClass: 'VTA'
        })
      })
    })

    describe('transitive inanimate verbs (VTI)', () => {
      it('parses VTI verbs', () => {
        expect(analyze('nahitôtam+V+TI+Ind+1Sg')).toEqual({
          lemma: 'nahitôtam',
          wordType: 'V',
          wordClass: 'VTI'
        })

        expect(analyze('PV/ati+ohpikihtâw+V+TI+Imp+Imm+2Sg')).toEqual({
          lemma: 'ohpikihtâw',
          wordType: 'V',
          wordClass: 'VTI'
        })

        expect(analyze('PV/e+itêyihtam+V+TI+Cnj+3Pl')).toEqual({
          lemma: 'itêyihtam',
          wordType: 'V',
          wordClass: 'VTI'
        })
      })

      it('parses VTI verbs with preverbs', () => {
        expect(analyze('PV/e+PV/ki+âpacihtâw+V+TI+Cnj+3Sg')).toEqual({
          lemma: 'âpacihtâw',
          wordType: 'V',
          wordClass: 'VTI'
        })

        expect(analyze('PV/kaa+PV/ki+wêhcihtâw+V+TI+Cnj+2Pl')).toEqual({
          lemma: 'wêhcihtâw',
          wordType: 'V',
          wordClass: 'VTI'
        })
      })

      it('parses VTI verbs with reduplication', () => {
        expect(analyze('PV/e+RdplW+tasîhtam+V+TI+Cnj+4Sg/Pl')).toEqual({
          lemma: 'tasîhtam',
          wordType: 'V',
          wordClass: 'VTI'
        })

        expect(analyze('RdplW+nitohtam+V+TI+Ind+1Sg')).toEqual({
          lemma: 'nitohtam',
          wordType: 'V',
          wordClass: 'VTI'
        })
      })
    })

    describe('pronouns', () => {
      it('parses pronouns', () => {
        expect(analyze('awiyak+Pron+Indef+A+Sg')).toEqual({
          lemma: 'awiyak',
          wordType: 'Pron',
          wordClass: 'Pron'
        })

        expect(analyze('ôhi+Pron+Dem+Prox+I+Pl')).toEqual({
          lemma: 'ôhi',
          wordType: 'Pron',
          wordClass: 'Pron'
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

      it('handles analysis with derivational morphology', () => {
        expect(analyze('iskwêcâkan+N+A+Der/Dim+N+A+Obv')).toEqual({
          lemma: 'iskwêcâkan',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('miyi+N+I+Der/Dim+N+I+Pl')).toEqual({
          lemma: 'miyi',
          wordType: 'N',
          wordClass: 'NI'
        })
      })

      it('handles dependent nouns (D tag)', () => {
        expect(analyze('misit+N+I+D+Px1Sg+Sg')).toEqual({
          lemma: 'misit',
          wordType: 'N',
          wordClass: 'NI'
        })

        expect(analyze('nîstâw+N+A+D+Px2Sg+Obv')).toEqual({
          lemma: 'nîstâw',
          wordType: 'N',
          wordClass: 'NA'
        })
      })
    })

    describe('complex preverb combinations', () => {
      it('handles multiple PV and reduplication together', () => {
        expect(analyze('PV/e+PV/isi+RdplW+ispiciw+V+AI+Cnj+3Sg')).toEqual({
          lemma: 'ispiciw',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PV/e+PV/ki+RdplW+natopayiw+V+AI+Cnj+3Pl')).toEqual({
          lemma: 'natopayiw',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('handles IC with preverbs', () => {
        expect(analyze('IC+PV/ako+ayâwêw+V+TA+Cnj+X+3PlO')).toEqual({
          lemma: 'ayâwêw',
          wordType: 'V',
          wordClass: 'VTA'
        })
      })
    })
  })
})

