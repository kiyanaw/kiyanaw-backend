const { processCharacters, analyze } = require('../lib/special-processing-ojbl')

// Most analysis strings below were returned by the spellcheck API for ojbl
describe('special-processing-ojbl', () => {
  describe('processCharacters', () => {
    it('trims whitespace', () => {
      expect(processCharacters('  makwa  ')).toBe('makwa')
    })

    it('keeps hyphens and apostrophes', () => {
      expect(processCharacters("anama'e-mazina'igan")).toBe("anama'e-mazina'igan")
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
    describe('verbs', () => {
      it('parses VAI verbs', () => {
        expect(analyze('nibaa+vai+3')).toEqual({ lemma: 'nibaa', wordType: 'V', wordClass: 'VAI' })
        expect(analyze('1+wanizi+vai+neg+dub')).toEqual({ lemma: 'wanizi', wordType: 'V', wordClass: 'VAI' })
      })

      it('parses VTA verbs', () => {
        expect(analyze('owaabamaan+vta+cnj+thmdir+3')).toEqual({ lemma: 'owaabamaan', wordType: 'V', wordClass: 'VTA' })
      })

      it('parses VTI, VII and VAIO verbs', () => {
        expect(analyze('3+ozhitoon+vti+thm0')).toEqual({ lemma: 'ozhitoon', wordType: 'V', wordClass: 'VTI' })
        expect(analyze('gizhaate+vii+0')).toEqual({ lemma: 'gizhaate', wordType: 'V', wordClass: 'VII' })
        expect(analyze('1+ayaan+vaio')).toEqual({ lemma: 'ayaan', wordType: 'V', wordClass: 'VAIO' })
      })

      it('uses the first POS tag when passives add +vai later', () => {
        expect(analyze('owaabamaan+vta+pass+vai+3')).toEqual({ lemma: 'owaabamaan', wordType: 'V', wordClass: 'VTA' })
      })
    })

    describe('prefixes and preverbs', () => {
      it('skips person prefixes and tense preverbs', () => {
        expect(analyze('1+prv+tam+gii+owaabamaan+vta+thmdir')).toEqual({ lemma: 'owaabamaan', wordType: 'V', wordClass: 'VTA' })
        expect(analyze('2+prv+tam+gii+nibaa+vai')).toEqual({ lemma: 'nibaa', wordType: 'V', wordClass: 'VAI' })
      })

      it('skips conjunct preverbs with and without a form', () => {
        expect(analyze('prv+cnj+gaa+nibaa+vai+cnj+3')).toEqual({ lemma: 'nibaa', wordType: 'V', wordClass: 'VAI' })
        expect(analyze('prv+ccnj+prv+tam+gii+nibaa+vai+cnj+3')).toEqual({ lemma: 'nibaa', wordType: 'V', wordClass: 'VAI' })
      })

      it('keeps prenouns in the lemma', () => {
        expect(analyze("anama'e-mazina'igan+ni")).toEqual({ lemma: "anama'e-mazina'igan", wordType: 'N', wordClass: 'NI' })
      })
    })

    describe('nouns', () => {
      it('parses animate and inanimate nouns', () => {
        expect(analyze('makwa+na')).toEqual({ lemma: 'makwa', wordType: 'N', wordClass: 'NA' })
        expect(analyze('anishinaabe+na+pl')).toEqual({ lemma: 'anishinaabe', wordType: 'N', wordClass: 'NA' })
        expect(analyze('odaabaan+na+obv')).toEqual({ lemma: 'odaabaan', wordType: 'N', wordClass: 'NA' })
        expect(analyze('jiimaan+ni+pl')).toEqual({ lemma: 'jiimaan', wordType: 'N', wordClass: 'NI' })
      })

      it('parses dependent nouns with a possessor', () => {
        expect(analyze('1+gimishoomis+nad')).toEqual({ lemma: 'gimishoomis', wordType: 'N', wordClass: 'NAD' })
        expect(analyze('1+nik+nid')).toEqual({ lemma: 'nik', wordType: 'N', wordClass: 'NID' })
      })

      it('parses proper nouns', () => {
        expect(analyze('Agaaming+pn')).toEqual({ lemma: 'Agaaming', wordType: 'N', wordClass: 'PN' })
      })

      it('parses unfinished export placeholder tags', () => {
        expect(analyze('gookom+nad-FIX-EXPORT')).toEqual({ lemma: 'gookom', wordType: 'N', wordClass: 'NAD' })
        expect(analyze('foo+noun-MORE-SPECIFICITY-REQUIRED')).toEqual({ lemma: 'foo', wordType: 'N', wordClass: null })
      })
    })

    describe('other parts of speech', () => {
      it('parses adverbs, particles, pronouns, interjections and phrases', () => {
        expect(analyze('omaa+adv')).toEqual({ lemma: 'omaa', wordType: 'ADV', wordClass: 'ADV' })
        expect(analyze('daga+pc')).toEqual({ lemma: 'daga', wordType: 'Ipc', wordClass: 'PC' })
        expect(analyze('wiin+pro')).toEqual({ lemma: 'wiin', wordType: 'Pron', wordClass: 'PRON' })
        expect(analyze('aaniin+phr')).toEqual({ lemma: 'aaniin', wordType: 'PHR', wordClass: 'PHR' })
        expect(analyze('boozhoo+inj')).toEqual({ lemma: 'boozhoo', wordType: 'Ipc', wordClass: 'INJ' })
      })
    })

    describe('edge cases', () => {
      let warnSpy

      beforeEach(() => {
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      })

      afterEach(() => {
        warnSpy.mockRestore()
      })

      it('returns nulls for null, undefined, empty or non-string input', () => {
        const empty = { lemma: null, wordType: null, wordClass: null }
        expect(analyze(null)).toEqual(empty)
        expect(analyze(undefined)).toEqual(empty)
        expect(analyze('')).toEqual(empty)
        expect(analyze('   ')).toEqual(empty)
        expect(analyze(42)).toEqual(empty)
        expect(warnSpy).not.toHaveBeenCalled()
      })

      it('returns nulls and warns when there is no POS tag', () => {
        expect(analyze('makwa')).toEqual({ lemma: null, wordType: null, wordClass: null })
        expect(analyze('makwa+pl')).toEqual({ lemma: null, wordType: null, wordClass: null })
        expect(warnSpy).toHaveBeenCalledTimes(2)
      })

      it('does not treat a leading POS-like part as a tag', () => {
        expect(analyze('na+na')).toEqual({ lemma: 'na', wordType: 'N', wordClass: 'NA' })
      })
    })
  })
})
