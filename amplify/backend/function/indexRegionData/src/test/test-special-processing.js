const {
  getLanguageProcessor,
  hasSpecialProcessing,
  getLemma,
  languages,
} = require('../lib/special-processing')

describe('special-processing registry', () => {
  describe('getLanguageProcessor', () => {
    it('returns processor for supported languages', () => {
      expect(getLanguageProcessor('bla')).not.toBeNull()
      expect(getLanguageProcessor('ciw')).not.toBeNull()
      expect(getLanguageProcessor('crk')).not.toBeNull()
      expect(getLanguageProcessor('cwd')).not.toBeNull()
      expect(getLanguageProcessor('gle')).not.toBeNull()
      expect(getLanguageProcessor('otwr')).not.toBeNull()
      expect(getLanguageProcessor('otwc')).not.toBeNull()
    })

    it('returns null for unsupported languages', () => {
      expect(getLanguageProcessor('xyz')).toBeNull()
      expect(getLanguageProcessor('eng')).toBeNull()
    })

    it('returns null for invalid input', () => {
      expect(getLanguageProcessor(null)).toBeNull()
      expect(getLanguageProcessor(undefined)).toBeNull()
      expect(getLanguageProcessor('')).toBeNull()
      expect(getLanguageProcessor(123)).toBeNull()
    })

    it('returns processor with analyze and processCharacters methods', () => {
      const processor = getLanguageProcessor('crk')
      expect(typeof processor.analyze).toBe('function')
      expect(typeof processor.processCharacters).toBe('function')
    })
  })

  describe('hasSpecialProcessing', () => {
    it('returns true for supported languages', () => {
      expect(hasSpecialProcessing('bla')).toBe(true)
      expect(hasSpecialProcessing('ciw')).toBe(true)
      expect(hasSpecialProcessing('crk')).toBe(true)
      expect(hasSpecialProcessing('cwd')).toBe(true)
      expect(hasSpecialProcessing('gle')).toBe(true)
      expect(hasSpecialProcessing('otwr')).toBe(true)
      expect(hasSpecialProcessing('otwc')).toBe(true)
    })

    it('returns false for unsupported languages', () => {
      expect(hasSpecialProcessing('xyz')).toBe(false)
      expect(hasSpecialProcessing('eng')).toBe(false)
      expect(hasSpecialProcessing('')).toBe(false)
    })
  })

  describe('getLemma', () => {
    describe('Plains Cree (crk)', () => {
      it('extracts lemma from verb analysis', () => {
        expect(getLemma('crk', 'PV/ati+ohpikihtâw+V+TI+Imp+Imm+2Sg')).toBe('ohpikihtâw')
        expect(getLemma('crk', 'nipâw+V+AI+Ind+Prs+1Sg')).toBe('nipâw')
      })

      it('extracts lemma from noun analysis', () => {
        expect(getLemma('crk', 'ahcahk+N+A+Sg')).toBe('ahcahk')
        expect(getLemma('crk', 'sîpiy+N+I+Sg')).toBe('sîpiy')
      })

      it('extracts lemma from particle analysis', () => {
        expect(getLemma('crk', 'êkây+Ipc')).toBe('êkây')
        expect(getLemma('crk', 'ahpô+Ipc')).toBe('ahpô')
      })
    })

    describe('Ojibwe (ciw)', () => {
      it('extracts lemma from verb analysis', () => {
        expect(getLemma('ciw', 'ayaa+VAI+Ind+Pos+Neu+1SgSubj')).toBe('ayaa')
      })

      it('extracts lemma from noun analysis', () => {
        expect(getLemma('ciw', 'anishinaabe+NA+ProxPl')).toBe('anishinaabe')
      })
    })

    describe('Siksika (bla)', () => {
      it('extracts lemma from verb analysis', () => {
        expect(getLemma('bla', 'Fut+waahkayi+VAI+Ind+3Sg')).toBe('waahkayi')
        expect(getLemma('bla', 'ino+VTA+Ind+1Sg+2SgO')).toBe('ino')
      })

      it('extracts lemma from noun analysis', () => {
        expect(getLemma('bla', 'ninaawa+NA+Sg')).toBe('ninaawa')
        expect(getLemma('bla', 'miiini+NI+Sg')).toBe('miiini')
      })
    })

    describe('Woods Cree (cwd)', () => {
      it('extracts lemma from verb analysis', () => {
        expect(getLemma('cwd', 'nipaw+V+AI+Ind+3Sg')).toBe('nipaw')
        expect(getLemma('cwd', 'PV/i+nipaw+V+AI+Cnj+1Sg')).toBe('nipaw')
      })

      it('extracts lemma from noun analysis', () => {
        expect(getLemma('cwd', 'pahkwisikan+N+A+Sg')).toBe('pahkwisikan')
        expect(getLemma('cwd', 'ciman+N+I+Sg')).toBe('ciman')
      })
    })

    describe('Irish (gle)', () => {
      it('extracts lemma from noun analysis', () => {
        expect(getLemma('gle', 'cuid+Noun+Fem+Gen+Sg')).toBe('cuid')
      })

      it('extracts lemma from verb analysis', () => {
        expect(getLemma('gle', 'ceangail+Verb+VT+FutInd')).toBe('ceangail')
      })

      it('extracts lemma from verbal noun analysis', () => {
        expect(getLemma('gle', 'feadail+Verbal+Noun+VI+Gen')).toBe('feadail')
      })
    })

    describe('Odawa (otwr/otwc)', () => {
      it('extracts lemma from verb analysis', () => {
        expect(getLemma('otwr', 'gwekshin+VAI+3')).toBe('gwekshin')
        expect(getLemma('otwc', 'gwekshin+VAI+3')).toBe('gwekshin')
      })

      it('extracts lemma from noun analysis', () => {
        expect(getLemma('otwr', '1+zhiishiip+NA')).toBe('zhiishiip')
      })
    })

    describe('edge cases', () => {
      it('returns null for unsupported language', () => {
        expect(getLemma('xyz', 'foo+V+AI')).toBeNull()
        expect(getLemma('eng', 'word+N')).toBeNull()
      })

      it('returns null for null/undefined language', () => {
        expect(getLemma(null, 'foo+V+AI')).toBeNull()
        expect(getLemma(undefined, 'foo+V+AI')).toBeNull()
      })

      it('returns null for empty/invalid analysis', () => {
        expect(getLemma('crk', '')).toBeNull()
        expect(getLemma('crk', null)).toBeNull()
        expect(getLemma('crk', undefined)).toBeNull()
      })
    })
  })

  describe('languages export', () => {
    it('exports language map for testing', () => {
      expect(languages).toBeDefined()
      expect(Object.keys(languages)).toContain('bla')
      expect(Object.keys(languages)).toContain('ciw')
      expect(Object.keys(languages)).toContain('crk')
      expect(Object.keys(languages)).toContain('cwd')
      expect(Object.keys(languages)).toContain('gle')
      expect(Object.keys(languages)).toContain('otwr')
      expect(Object.keys(languages)).toContain('otwc')
    })
  })
})
