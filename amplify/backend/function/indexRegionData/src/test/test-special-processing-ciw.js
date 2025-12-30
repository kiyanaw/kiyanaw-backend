const { processCharacters, analyze } = require('../lib/special-processing-ciw')

describe('special-processing-ciw', () => {
  describe('processCharacters', () => {
    it('trims whitespace', () => {
      expect(processCharacters('  hello  ')).toBe('hello')
      expect(processCharacters('test ')).toBe('test')
      expect(processCharacters(' word')).toBe('word')
    })

    it('handles null and undefined', () => {
      expect(processCharacters(null)).toBe(null)
      expect(processCharacters(undefined)).toBe(undefined)
    })

    it('handles empty string', () => {
      expect(processCharacters('')).toBe('')
    })
  })

  describe('analyze', () => {
    describe('verbs (VAI)', () => {
      it('parses simple VAI verbs', () => {
        expect(analyze('ayaa+VAI+Ind+Pos+Neu+1SgSubj')).toEqual({
          lemma: 'ayaa',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('aawajimine+VAI+Ind+Pos+Neu+3SgProxSubj')).toEqual({
          lemma: 'aawajimine',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('ikido+VAI+Ind+Pos+Neu+3SgProxSubj')).toEqual({
          lemma: 'ikido',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses VAI verbs with preverbs', () => {
        expect(analyze('PVDir/awi+doodam+VAI+Cnj+Pos+Neu+ExclSubj')).toEqual({
          lemma: 'doodam',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PVTense/gii+izhaa+VAI+Ind+Pos+Neu+1SgSubj')).toEqual({
          lemma: 'izhaa',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PVTense/gii+izhichige+VAI+Ind+Pos+Neu+3PlProxSubj')).toEqual({
          lemma: 'izhichige',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses VAI verbs with multiple preverbs', () => {
        expect(analyze('ChCnj+PVTense/gii+ayaa+VAI+Cnj+Pos+Neu+2SgSubj')).toEqual({
          lemma: 'ayaa',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PVTense/gii+PVDir/bi+PVLex/anda+waabam+VTA+Ind+Pos+Neu+3SgProxSubj+1SgObj')).toEqual({
          lemma: 'waabam',
          wordType: 'V',
          wordClass: 'VTA'
        })
      })
    })

    describe('transitive animate verbs (VTA)', () => {
      it('parses simple VTA verbs', () => {
        expect(analyze('izhi+VTA+Ind+Pos+Neu+1SgSubj+3SgProxObj')).toEqual({
          lemma: 'izhi',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('wiinzh+VTA+Ind+Pos+Neu+3SgProxSubj+3PlObvObj')).toEqual({
          lemma: 'wiinzh',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('makam+VTA+Ind+Pos+Neu+3PlProxSubj+2SgObj')).toEqual({
          lemma: 'makam',
          wordType: 'V',
          wordClass: 'VTA'
        })
      })

      it('parses VTA verbs with preverbs', () => {
        expect(analyze('PVTense/ga+miizh+VTA+Ind+Pos+Neu+XSubj+2SgObj')).toEqual({
          lemma: 'miizh',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('ChCnj+PVTense/gii+PVDir/bi+andawaabam+VTA+Cnj+Pos+Neu+3SgProxSubj+1SgObj')).toEqual({
          lemma: 'andawaabam',
          wordType: 'V',
          wordClass: 'VTA'
        })
      })
    })

    describe('transitive inanimate verbs (VTI)', () => {
      it('parses simple VTI verbs', () => {
        expect(analyze('gikendan+VTI+Ind+Pos+Neu+2SgSubj+0SgObj')).toEqual({
          lemma: 'gikendan',
          wordType: 'V',
          wordClass: 'VTI'
        })

        expect(analyze('wawezhitoon+VTI+Cnj+Pos+Neu+ExclSubj+0PlObj')).toEqual({
          lemma: 'wawezhitoon',
          wordType: 'V',
          wordClass: 'VTI'
        })

        expect(analyze('debaabandan+VTI+Ind+Pos+Neu+1SgSubj+0SgObj')).toEqual({
          lemma: 'debaabandan',
          wordType: 'V',
          wordClass: 'VTI'
        })
      })

      it('parses VTI verbs with preverbs', () => {
        expect(analyze('PVSub/e+PVTense/gii+ozhitoon+VTI+Cnj+Pos+Neu+2PlSubj+0PlObj')).toEqual({
          lemma: 'ozhitoon',
          wordType: 'V',
          wordClass: 'VTI'
        })

        expect(analyze('PVTense/ga+giziinan+VTI+Cnj+Pos+Neu+3PlProxSubj+0PlObj')).toEqual({
          lemma: 'giziinan',
          wordType: 'V',
          wordClass: 'VTI'
        })
      })
    })

    describe('inanimate intransitive verbs (VII)', () => {
      it('parses simple VII verbs', () => {
        expect(analyze('ate+VII+Ind+Pos+Neu+0PlSubj')).toEqual({
          lemma: 'ate',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('waasaashkaa+VII+Ind+Pos+Neu+0SgSubj')).toEqual({
          lemma: 'waasaashkaa',
          wordType: 'V',
          wordClass: 'VII'
        })
      })

      it('parses VII verbs with preverbs', () => {
        expect(analyze('PVLex/gichi+onzaamaanimad+VII+Ind+Pos+Neu+0SgSubj')).toEqual({
          lemma: 'onzaamaanimad',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('PVTense/ga+ate+VII+Cnj+Pos+Neu+0PlSubj')).toEqual({
          lemma: 'ate',
          wordType: 'V',
          wordClass: 'VII'
        })
      })
    })

    describe('animate nouns (NA)', () => {
      it('parses simple NA nouns', () => {
        expect(analyze('anishinaabe+NA+ProxPl')).toEqual({
          lemma: 'anishinaabe',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('ogimaakaan+NA+ProxSg')).toEqual({
          lemma: 'ogimaakaan',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('ginebig+NA+ProxSg')).toEqual({
          lemma: 'ginebig',
          wordType: 'N',
          wordClass: 'NA'
        })
      })
    })

    describe('inanimate nouns (NI)', () => {
      it('parses simple NI nouns', () => {
        expect(analyze('bawishkamookizin+NI+Sg')).toEqual({
          lemma: 'bawishkamookizin',
          wordType: 'N',
          wordClass: 'NI'
        })

        expect(analyze('nibewin+NI+Sg')).toEqual({
          lemma: 'nibewin',
          wordType: 'N',
          wordClass: 'NI'
        })

        expect(analyze('aabajichigan+NI+Pl')).toEqual({
          lemma: 'aabajichigan',
          wordType: 'N',
          wordClass: 'NI'
        })

        expect(analyze('zaaga\'igan+NI+Sg')).toEqual({
          lemma: 'zaaga\'igan',
          wordType: 'N',
          wordClass: 'NI'
        })
      })

      it('parses NI nouns with locative', () => {
        expect(analyze('oodena+NI+Loc')).toEqual({
          lemma: 'oodena',
          wordType: 'N',
          wordClass: 'NI'
        })

        expect(analyze('miikana+NI+Loc')).toEqual({
          lemma: 'miikana',
          wordType: 'N',
          wordClass: 'NI'
        })
      })
    })

    describe('dependent nouns (NAD)', () => {
      it('parses NAD nouns', () => {
        expect(analyze('daanis+NAD+ObvPl+1SgPoss')).toEqual({
          lemma: 'daanis',
          wordType: 'N',
          wordClass: 'NAD'
        })

        expect(analyze('daanis+NAD+ProxSg+1SgPoss')).toEqual({
          lemma: 'daanis',
          wordType: 'N',
          wordClass: 'NAD'
        })

        expect(analyze('gozis+NAD+ObvPl+3SgProxPoss')).toEqual({
          lemma: 'gozis',
          wordType: 'N',
          wordClass: 'NAD'
        })
      })
    })

    describe('adverbs', () => {
      it('parses location adverbs', () => {
        expect(analyze('omaa+ADVLoc')).toEqual({
          lemma: 'omaa',
          wordType: 'ADV',
          wordClass: 'ADVLoc'
        })

        expect(analyze('agaaming+ADVLoc')).toEqual({
          lemma: 'agaaming',
          wordType: 'ADV',
          wordClass: 'ADVLoc'
        })

        expect(analyze('imaa+ADVLoc')).toEqual({
          lemma: 'imaa',
          wordType: 'ADV',
          wordClass: 'ADVLoc'
        })

        expect(analyze('zaagiing+ADVLoc')).toEqual({
          lemma: 'zaagiing',
          wordType: 'ADV',
          wordClass: 'ADVLoc'
        })
      })

      it('parses temporal adverbs', () => {
        expect(analyze('mewinzha+ADVTmp')).toEqual({
          lemma: 'mewinzha',
          wordType: 'ADV',
          wordClass: 'ADVTmp'
        })

        expect(analyze('megwaa+ADVTmp')).toEqual({
          lemma: 'megwaa',
          wordType: 'ADV',
          wordClass: 'ADVTmp'
        })

        expect(analyze('noongom+ADVTmp')).toEqual({
          lemma: 'noongom',
          wordType: 'ADV',
          wordClass: 'ADVTmp'
        })
      })

      it('parses other adverb types', () => {
        expect(analyze('mii+ADVPred')).toEqual({
          lemma: 'mii',
          wordType: 'ADV',
          wordClass: 'ADVPred'
        })

        expect(analyze('idash+ADVConj')).toEqual({
          lemma: 'idash',
          wordType: 'ADV',
          wordClass: 'ADVConj'
        })

        expect(analyze('aapiji+ADVDeg')).toEqual({
          lemma: 'aapiji',
          wordType: 'ADV',
          wordClass: 'ADVDeg'
        })

        expect(analyze('gaawiin+ADVNeg')).toEqual({
          lemma: 'gaawiin',
          wordType: 'ADV',
          wordClass: 'ADVNeg'
        })
      })
    })

    describe('pronouns', () => {
      it('parses demonstrative pronouns', () => {
        expect(analyze('iwe+PRONDem+NI+Sg')).toEqual({
          lemma: 'iwe',
          wordType: 'Pron',
          wordClass: 'PRONDem'
        })

        expect(analyze('ini+PRONDem+NA+ObvPl')).toEqual({
          lemma: 'ini',
          wordType: 'Pron',
          wordClass: 'PRONDem'
        })

        expect(analyze('awe+PRONDem+NA+ProxSg')).toEqual({
          lemma: 'awe',
          wordType: 'Pron',
          wordClass: 'PRONDem'
        })
      })

      it('parses personal pronouns', () => {
        expect(analyze('wiinawaa+PRONPer+NA+3Pl')).toEqual({
          lemma: 'wiinawaa',
          wordType: 'Pron',
          wordClass: 'PRONPer'
        })
      })

      it('parses interrogative pronouns', () => {
        expect(analyze('awenen+PRONInter+NA+ProxSg')).toEqual({
          lemma: 'awenen',
          wordType: 'Pron',
          wordClass: 'PRONInter'
        })

        expect(analyze('awenenag+PRONInter+NA+ProxPl')).toEqual({
          lemma: 'awenenag',
          wordType: 'Pron',
          wordClass: 'PRONInter'
        })
      })

      it('parses indefinite pronouns', () => {
        expect(analyze('gegoo+PRONIndf+NI')).toEqual({
          lemma: 'gegoo',
          wordType: 'Pron',
          wordClass: 'PRONIndf'
        })
      })
    })

    describe('particles', () => {
      it('parses emphatic particles', () => {
        expect(analyze('gosha+PCEmph')).toEqual({
          lemma: 'gosha',
          wordType: 'Ipc',
          wordClass: 'PCEmph'
        })

        expect(analyze('igo+PCEmph')).toEqual({
          lemma: 'igo',
          wordType: 'Ipc',
          wordClass: 'PCEmph'
        })
      })

      it('parses discourse particles', () => {
        expect(analyze('na+PCDisc')).toEqual({
          lemma: 'na',
          wordType: 'Ipc',
          wordClass: 'PCDisc'
        })

        expect(analyze('go+PCDisc')).toEqual({
          lemma: 'go',
          wordType: 'Ipc',
          wordClass: 'PCDisc'
        })

        expect(analyze('daga+PCDisc')).toEqual({
          lemma: 'daga',
          wordType: 'Ipc',
          wordClass: 'PCDisc'
        })
      })

      it('parses interjection particles', () => {
        expect(analyze('ambe+PCInterj')).toEqual({
          lemma: 'ambe',
          wordType: 'Ipc',
          wordClass: 'PCInterj'
        })
      })

      it('parses aspect particles', () => {
        expect(analyze('ko+PCAsp')).toEqual({
          lemma: 'ko',
          wordType: 'Ipc',
          wordClass: 'PCAsp'
        })

        expect(analyze('ako+PCAsp')).toEqual({
          lemma: 'ako',
          wordType: 'Ipc',
          wordClass: 'PCAsp'
        })
      })
    })

    describe('numbers', () => {
      it('parses number tags', () => {
        expect(analyze('bezhig+NUM')).toEqual({
          lemma: 'bezhig',
          wordType: 'NUM',
          wordClass: 'NUM'
        })
      })
    })

    describe('examples from FST test data', () => {
      it('parses additional location adverbs', () => {
        expect(analyze('odaanaang+ADVLoc')).toEqual({
          lemma: 'odaanaang',
          wordType: 'ADV',
          wordClass: 'ADVLoc'
        })

        expect(analyze('mishawagaam+ADVLoc')).toEqual({
          lemma: 'mishawagaam',
          wordType: 'ADV',
          wordClass: 'ADVLoc'
        })

        expect(analyze('o\'omaa+ADVLoc')).toEqual({
          lemma: 'o\'omaa',
          wordType: 'ADV',
          wordClass: 'ADVLoc'
        })

        expect(analyze('noopimiing+ADVLoc')).toEqual({
          lemma: 'noopimiing',
          wordType: 'ADV',
          wordClass: 'ADVLoc'
        })
      })

      it('parses additional temporal and manner adverbs', () => {
        expect(analyze('ganabaj+ADVMan')).toEqual({
          lemma: 'ganabaj',
          wordType: 'ADV',
          wordClass: 'ADVMan'
        })

        expect(analyze('zhebaa+ADVTmp')).toEqual({
          lemma: 'zhebaa',
          wordType: 'ADV',
          wordClass: 'ADVTmp'
        })

        expect(analyze('wiikaa+ADVTmp')).toEqual({
          lemma: 'wiikaa',
          wordType: 'ADV',
          wordClass: 'ADVTmp'
        })

        expect(analyze('wenda-gabe-ishkwaa-naawakwe+ADVTmp')).toEqual({
          lemma: 'wenda-gabe-ishkwaa-naawakwe',
          wordType: 'ADV',
          wordClass: 'ADVTmp'
        })
      })

      it('parses VAI verbs with various preverb combinations', () => {
        expect(analyze('bimibatoo+VAI+Ind+Pos+Neu+3PlObvSubj')).toEqual({
          lemma: 'bimibatoo',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('bimibatoo+VAI+Ind+Pos+Neu+3SgObvSubj')).toEqual({
          lemma: 'bimibatoo',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PVTense/gii+nameshin+VAI+Ind+Pos+Neu+3SgProxSubj')).toEqual({
          lemma: 'nameshin',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PVTense/gii+bimi-ayaa+VAI+Cnj+Pos+Dub+3SgProxSubj')).toEqual({
          lemma: 'bimi-ayaa',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PVTense/gii+PVDir/bimi+ayaa+VAI+Cnj+Pos+Dub+3SgProxSubj')).toEqual({
          lemma: 'ayaa',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PVTense/gii+bimi-ayaa+VAI+Ind+Pos+Neu+3PlProxSubj')).toEqual({
          lemma: 'bimi-ayaa',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PVTense/gii+PVDir/bimi+ayaa+VAI+Ind+Pos+Neu+3PlProxSubj')).toEqual({
          lemma: 'ayaa',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PVTense/wii+babaamaakwii+VAI+Ind+Pos+Neu+1SgSubj')).toEqual({
          lemma: 'babaamaakwii',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PVTense/wii\'+andawagoodoo+VAI+Ind+Pos+Neu+1SgSubj')).toEqual({
          lemma: 'andawagoodoo',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PVSub/gaa+PVTense/gii+PVDir/bimi+miikanaake+VAI+Cnj+Pos+Neu+3PlProxSubj')).toEqual({
          lemma: 'miikanaake',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PVTense/gii+aazhawibizo+VAI+Ind+Pos+Neu+3SgProxSubj')).toEqual({
          lemma: 'aazhawibizo',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('ChCnj+PVTense/gii+aazhawishin+VAI+Cnj+Pos+Neu+3PlObvSubj')).toEqual({
          lemma: 'aazhawishin',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('ChCnj+PVTense/gii+aazhawishin+VAI+Cnj+Pos+Neu+3SgObvSubj')).toEqual({
          lemma: 'aazhawishin',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PVSub/gaa+aazhawishin+VAI+Cnj+Pos+Neu+3PlObvSubj')).toEqual({
          lemma: 'aazhawishin',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PVSub/gaa+aazhawishin+VAI+Cnj+Pos+Neu+3SgObvSubj')).toEqual({
          lemma: 'aazhawishin',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses VTA verbs with various preverb combinations', () => {
        expect(analyze('babaama\'azh+VTA+Ind+Pos+Neu+3SgProxSubj+3SgObvObj')).toEqual({
          lemma: 'babaama\'azh',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('babaama\'azh+VTA+Ind+Pos+Neu+3SgProxSubj+3PlObvObj')).toEqual({
          lemma: 'babaama\'azh',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('PVTense/wii+ikoshim+VTA+Ind+Pos+Neu+3SgProxSubj+3SgObvObj')).toEqual({
          lemma: 'ikoshim',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('PVTense/wii+ikoshim+VTA+Ind+Pos+Neu+3SgProxSubj+3PlObvObj')).toEqual({
          lemma: 'ikoshim',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('ChCnj+PVDir/bi+ayaaw+VTA+Cnj+Pos+Neu+3SgProxSubj+3SgObvObj')).toEqual({
          lemma: 'ayaaw',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('ChCnj+PVDir/bi+ayaaw+VTA+Cnj+Pos+Neu+3SgProxSubj+3PlObvObj')).toEqual({
          lemma: 'ayaaw',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('ChCnj+PVDir/bi+ayaa+VAI+Cnj+Pos+Neu+3PlProxSubj')).toEqual({
          lemma: 'ayaa',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PVTense/gii+PVDir/bimi+ayaaw+VTA+Cnj+Pos+Neu+1SgSubj+3SgProxObj')).toEqual({
          lemma: 'ayaaw',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('anoozh+VTA+Ind+Pos+Neu+XSubj+2SgObj')).toEqual({
          lemma: 'anoozh',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('anoozh+VTA+Ind+Pos+Neu+ExclSubj+2SgObj')).toEqual({
          lemma: 'anoozh',
          wordType: 'V',
          wordClass: 'VTA'
        })
      })

      it('parses VTI verbs with various preverb combinations', () => {
        expect(analyze('ayaan+VTI+Ind+Pos+Neu+3SgProxSubj+0SgObj')).toEqual({
          lemma: 'ayaan',
          wordType: 'V',
          wordClass: 'VTI'
        })

        expect(analyze('PVTense/ga+PVDir/o+wiindan+VTI+Cnj+Pos+Neu+2SgSubj+0SgObj')).toEqual({
          lemma: 'wiindan',
          wordType: 'V',
          wordClass: 'VTI'
        })

        expect(analyze('PVTense/ga+PVDir/o+wiindan+VTI+Cnj+Pos+Neu+2SgSubj+0PlObj')).toEqual({
          lemma: 'wiindan',
          wordType: 'V',
          wordClass: 'VTI'
        })

        expect(analyze('PVTense/daa+PVDir/o+wiindan+VTI+Cnj+Pos+Neu+2SgSubj+0SgObj')).toEqual({
          lemma: 'wiindan',
          wordType: 'V',
          wordClass: 'VTI'
        })

        expect(analyze('PVTense/daa+PVDir/o+wiindan+VTI+Cnj+Pos+Neu+2SgSubj+0PlObj')).toEqual({
          lemma: 'wiindan',
          wordType: 'V',
          wordClass: 'VTI'
        })

        expect(analyze('gotan+VTI+Ind+Pos+Neu+3SgProxSubj+0SgObj')).toEqual({
          lemma: 'gotan',
          wordType: 'V',
          wordClass: 'VTI'
        })

        expect(analyze('PVTense/gii+ayaan+VTI+Ind+Pos+Neu+1SgSubj+0SgObj')).toEqual({
          lemma: 'ayaan',
          wordType: 'V',
          wordClass: 'VTI'
        })
      })

      it('parses VII verbs with various preverb combinations', () => {
        expect(analyze('PVTense/gii+bimi-ayaa+VII+Cnj+Pos+Dub+0SgSubj')).toEqual({
          lemma: 'bimi-ayaa',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('PVTense/gii+bimi-ayaa+VII+Cnj+Pos+Dub+0PlSubj')).toEqual({
          lemma: 'bimi-ayaa',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('PVTense/gii+PVDir/bimi+ayaa+VII+Cnj+Pos+Dub+0SgSubj')).toEqual({
          lemma: 'ayaa',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('PVTense/gii+PVDir/bimi+ayaa+VII+Cnj+Pos+Dub+0PlSubj')).toEqual({
          lemma: 'ayaa',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('PVLex/wenda+PVLex/gabe+PVLex/ishkwaa+naawakwe+VII+Ind+Pos+Neu+0SgSubj')).toEqual({
          lemma: 'naawakwe',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('PVLex/wenda+PVLex/gabe+ishkwaa-naawakwe+VII+Ind+Pos+Neu+0SgSubj')).toEqual({
          lemma: 'ishkwaa-naawakwe',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('ChCnj+ishpaa+VII+Cnj+Pos+Neu+0PlObvSubj')).toEqual({
          lemma: 'ishpaa',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('ChCnj+ishpaa+VII+Cnj+Pos+Neu+0SgObvSubj')).toEqual({
          lemma: 'ishpaa',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('ishpaa+VII+Pcp+Pos+Neu+0SgObvSubj+0SgObvHead')).toEqual({
          lemma: 'ishpaa',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('ChCnj+PVTense/gii+PVRel/izhi+aazhawamon+VII+Cnj+Pos+Neu+0SgSubj')).toEqual({
          lemma: 'aazhawamon',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('ChCnj+PVTense/gii+PVRel/izhi+aazhawamon+VII+Cnj+Pos+Neu+0PlSubj')).toEqual({
          lemma: 'aazhawamon',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('PVTense/gii+PVRel/izhi+aazhawamon+VII+Pcp+Pos+Neu+0SgSubj+0SgHead')).toEqual({
          lemma: 'aazhawamon',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('PVSub/gaa+PVRel/izhi+aazhawamon+VII+Cnj+Pos+Neu+0SgSubj')).toEqual({
          lemma: 'aazhawamon',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('PVSub/gaa+PVRel/izhi+aazhawamon+VII+Cnj+Pos+Neu+0PlSubj')).toEqual({
          lemma: 'aazhawamon',
          wordType: 'V',
          wordClass: 'VII'
        })

        expect(analyze('dabasaakosin+VII+Ind+Pos+Neu+0SgSubj')).toEqual({
          lemma: 'dabasaakosin',
          wordType: 'V',
          wordClass: 'VII'
        })
      })

      it('parses additional NA nouns', () => {
        expect(analyze('waawaashkeshi+NA+ObvPl')).toEqual({
          lemma: 'waawaashkeshi',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('waawaashkeshi+NA+ObvSg')).toEqual({
          lemma: 'waawaashkeshi',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('manidoo+NA+ProxPl')).toEqual({
          lemma: 'manidoo',
          wordType: 'N',
          wordClass: 'NA'
        })
      })

      it('parses additional NI nouns', () => {
        expect(analyze('mitig+NI+Pl')).toEqual({
          lemma: 'mitig',
          wordType: 'N',
          wordClass: 'NI'
        })

        expect(analyze('mitig+NA+ObvPl')).toEqual({
          lemma: 'mitig',
          wordType: 'N',
          wordClass: 'NA'
        })

        expect(analyze('mitig+NA+ObvSg')).toEqual({
          lemma: 'mitig',
          wordType: 'N',
          wordClass: 'NA'
        })
      })

      it('parses additional NAD nouns', () => {
        expect(analyze('day+NAD+ObvPl+3SgProxPoss')).toEqual({
          lemma: 'day',
          wordType: 'N',
          wordClass: 'NAD'
        })

        expect(analyze('day+NAD+ObvSg+3SgProxPoss')).toEqual({
          lemma: 'day',
          wordType: 'N',
          wordClass: 'NAD'
        })
      })

      it('parses additional pronouns', () => {
        expect(analyze('a\'aw+PRONDem')).toEqual({
          lemma: 'a\'aw',
          wordType: 'Pron',
          wordClass: 'PRONDem'
        })

        expect(analyze('iniwen+PRONDem')).toEqual({
          lemma: 'iniwen',
          wordType: 'Pron',
          wordClass: 'PRONDem'
        })

        expect(analyze('a\'awe+PRONDem')).toEqual({
          lemma: 'a\'awe',
          wordType: 'Pron',
          wordClass: 'PRONDem'
        })

        expect(analyze('igiweg+PRONDem')).toEqual({
          lemma: 'igiweg',
          wordType: 'Pron',
          wordClass: 'PRONDem'
        })

        expect(analyze('iniw+PRONDem')).toEqual({
          lemma: 'iniw',
          wordType: 'Pron',
          wordClass: 'PRONDem'
        })

        expect(analyze('i\'iw+PRONDem')).toEqual({
          lemma: 'i\'iw',
          wordType: 'Pron',
          wordClass: 'PRONDem'
        })
      })

      it('parses additional adverb types', () => {
        expect(analyze('daabishkoo+ADVGram')).toEqual({
          lemma: 'daabishkoo',
          wordType: 'ADV',
          wordClass: 'ADVGram'
        })

        expect(analyze('aaniish+ADVInter')).toEqual({
          lemma: 'aaniish',
          wordType: 'ADV',
          wordClass: 'ADVInter'
        })

        expect(analyze('aanind+ADVQnt')).toEqual({
          lemma: 'aanind',
          wordType: 'ADV',
          wordClass: 'ADVQnt'
        })

        expect(analyze('niibowa+ADVQnt')).toEqual({
          lemma: 'niibowa',
          wordType: 'ADV',
          wordClass: 'ADVQnt'
        })

        expect(analyze('onzaam+ADVQnt')).toEqual({
          lemma: 'onzaam',
          wordType: 'ADV',
          wordClass: 'ADVQnt'
        })

        expect(analyze('gakina+ADVQnt')).toEqual({
          lemma: 'gakina',
          wordType: 'ADV',
          wordClass: 'ADVQnt'
        })

        expect(analyze('minik+ADVQnt')).toEqual({
          lemma: 'minik',
          wordType: 'ADV',
          wordClass: 'ADVQnt'
        })

        expect(analyze('wiinge+ADVDeg')).toEqual({
          lemma: 'wiinge',
          wordType: 'ADV',
          wordClass: 'ADVDeg'
        })

        expect(analyze('gegaa+ADVDeg')).toEqual({
          lemma: 'gegaa',
          wordType: 'ADV',
          wordClass: 'ADVDeg'
        })

        expect(analyze('miziwe+ADVLoc')).toEqual({
          lemma: 'miziwe',
          wordType: 'ADV',
          wordClass: 'ADVLoc'
        })

        expect(analyze('nitam+ADVLoc')).toEqual({
          lemma: 'nitam',
          wordType: 'ADV',
          wordClass: 'ADVLoc'
        })
      })

      it('parses complex preverb combinations with PVRel', () => {
        expect(analyze('ChCnj+PVTense/gii+PVRel/izhi+ashi+VTA+Cnj+Pos+Neu+3SgProxSubj+3PlObvObj')).toEqual({
          lemma: 'ashi',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('ChCnj+PVTense/ga+PVRel/izhi+aabajitoon+VTI+Cnj+Pos+Neu+XSubj+0PlObj')).toEqual({
          lemma: 'aabajitoon',
          wordType: 'V',
          wordClass: 'VTI'
        })

        expect(analyze('ChCnj+PVTense/gii+PVRel/izhi+zhiigonige+VAI+Cnj+Pos+Neu+3PlProxSubj')).toEqual({
          lemma: 'zhiigonige',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses additional VAI verbs with ChCnj', () => {
        expect(analyze('ChCnj+daa+VAI+Cnj+Pos+Neu+1SgSubj')).toEqual({
          lemma: 'daa',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('ChCnj+PVTense/gii+doodaw+VTA+Cnj+Pos+Neu+3PlProxSubj+1SgObj')).toEqual({
          lemma: 'doodaw',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('ChCnj+PVTense/gii+PVTense/gii+miizh+VTA+Cnj+Pos+Neu+ExclSubj+2SgObj')).toEqual({
          lemma: 'miizh',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('ChCnj+PVTense/gii+jaaginige+VAI+Cnj+Pos+Neu+2PlSubj')).toEqual({
          lemma: 'jaaginige',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('ChCnj+ayaa+VAI+Cnj+Pos+Neu+3PlObvSubj')).toEqual({
          lemma: 'ayaa',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses additional VTA verbs', () => {
        expect(analyze('PVTense/gii+doodaw+VTA+Ind+Pos+Neu+3SgProxSubj+1SgObj')).toEqual({
          lemma: 'doodaw',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('PVTense/gii+PVDir/bi+PVLex/anda+waabam+VTA+Ind+Pos+Neu+3SgProxSubj+1SgObj')).toEqual({
          lemma: 'waabam',
          wordType: 'V',
          wordClass: 'VTA'
        })
      })

      it('parses additional VAI verbs', () => {
        expect(analyze('PVTense/gii+gagwedwe+VAI+Ind+Pos+Neu+1SgSubj')).toEqual({
          lemma: 'gagwedwe',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PVTense/ga+izhichige+VAI+Cnj+Pos+Neu+3PlProxSubj')).toEqual({
          lemma: 'izhichige',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('gikendam+VAI+Ind+Pos+Neu+ExclSubj')).toEqual({
          lemma: 'gikendam',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('mawadishiwe+VAI+Cnj+Pos+Neu+1SgSubj')).toEqual({
          lemma: 'mawadishiwe',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('bakaanizi+VAI+Ind+Pos+Neu+3SgProxSubj')).toEqual({
          lemma: 'bakaanizi',
          wordType: 'V',
          wordClass: 'VAI'
        })

        expect(analyze('PVTense/gii+bakaanizi+VAI+Ind+Pos+Neu+3SgProxSubj')).toEqual({
          lemma: 'bakaanizi',
          wordType: 'V',
          wordClass: 'VAI'
        })
      })

      it('parses additional VII verbs', () => {
        expect(analyze('PVTense/ga+inaginde+VII+Ind+Pos+Neu+0SgSubj')).toEqual({
          lemma: 'inaginde',
          wordType: 'V',
          wordClass: 'VII'
        })
      })

      it('parses additional NI nouns with possessive', () => {
        expect(analyze('izhichigewin+NI+Sg+3PlProxPoss')).toEqual({
          lemma: 'izhichigewin',
          wordType: 'N',
          wordClass: 'NI'
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

      it('handles complex preverb combinations', () => {
        expect(analyze('ChCnj+PVTense/gii+PVDir/awi+PVRel/izhi+webinamaw+VTA+Cnj+Pos+Neu+3SgProxSubj+3PlObvObj')).toEqual({
          lemma: 'webinamaw',
          wordType: 'V',
          wordClass: 'VTA'
        })

        expect(analyze('PVLex/wenda+PVLex/gabe+PVLex/ishkwaa+naawakwe+VII+Ind+Pos+Neu+0SgSubj')).toEqual({
          lemma: 'naawakwe',
          wordType: 'V',
          wordClass: 'VII'
        })
      })

      it('handles nominal lexical prefixes', () => {
        expect(analyze('PNLex/oshki+aazhogan+NI+Sg')).toEqual({
          lemma: 'aazhogan',
          wordType: 'N',
          wordClass: 'NI'
        })

        expect(analyze('PNLex/gete+aazhogan+NI+Pej+Sg')).toEqual({
          lemma: 'aazhogan',
          wordType: 'N',
          wordClass: 'NI'
        })
      })
    })
  })
})

