const { callerId, canClip, sanitizeStem, clipDownloadName, clipDisposition } = require('../lib/clip-auth')

describe('callerId', () => {
  it('reads sub, then claims, then username', () => {
    expect(callerId({ sub: 'abc' })).toBe('abc')
    expect(callerId({ claims: { sub: 'def' } })).toBe('def')
    expect(callerId({ claims: { 'cognito:username': 'ghi' } })).toBe('ghi')
    expect(callerId({ username: 'jkl' })).toBe('jkl')
    expect(callerId(null)).toBeNull()
    expect(callerId({})).toBeNull()
  })
})

describe('canClip (owner-or-public gate)', () => {
  it('allows the transcription author on a private transcription', () => {
    expect(canClip({ author: 'u1', isPrivate: true }, { sub: 'u1' })).toBe(true)
  })

  it('denies a non-author on a private transcription', () => {
    expect(canClip({ author: 'u1', isPrivate: true }, { sub: 'u2' })).toBe(false)
  })

  it('allows anyone when the transcription is public', () => {
    expect(canClip({ author: 'u1', isPrivate: false }, { sub: 'u2' })).toBe(true)
  })

  it('denies when there is no transcription or no caller on a private one', () => {
    expect(canClip(null, { sub: 'u1' })).toBe(false)
    expect(canClip({ author: 'u1', isPrivate: true }, null)).toBe(false)
  })
})

describe('sanitizeStem', () => {
  it('keeps letters/numbers, dashes spaces, drops punctuation, caps length', () => {
    expect(sanitizeStem('Taanshi kiya?')).toBe('Taanshi-kiya')
    expect(sanitizeStem('  So-so, fair!  ')).toBe('So-so-fair')
    expect(sanitizeStem('a'.repeat(100)).length).toBe(60)
  })

  it('returns empty for null/blank', () => {
    expect(sanitizeStem(null)).toBe('')
    expect(sanitizeStem('   ')).toBe('')
  })
})

describe('clipDownloadName', () => {
  it('derives a friendly name from region text', () => {
    expect(clipDownloadName({ regionText: 'Taanshi kiya?', start: 3 })).toBe('Taanshi-kiya.mp3')
  })

  it('falls back to the start time when there is no text', () => {
    expect(clipDownloadName({ regionText: '', start: 12.6 })).toBe('region-13s.mp3')
    expect(clipDownloadName({ start: 0 })).toBe('region-0s.mp3')
  })
})

describe('clipDisposition (RFC 6266/5987, S3 needs ISO-8859-1)', () => {
  const isLatin1 = (v) => /^[\x20-\x7e]*$/.test(v)

  it('encodes a name with non-Latin-1 letters and keeps an ASCII fallback', () => {
    const d = clipDisposition({ regionText: 'Uŋčí-ĺi', start: 4 })
    expect(d).toBe(`attachment; filename="Uci-li.mp3"; filename*=UTF-8''U%C5%8B%C4%8D%C3%AD-%C4%BAi.mp3`)
    expect(isLatin1(d)).toBe(true)
    expect(decodeURIComponent(d.split("UTF-8''")[1])).toBe('Uŋčí-ĺi.mp3')
  })

  it('falls back to the start-time name for syllabics', () => {
    const d = clipDisposition({ regionText: 'ᓀᐦᐃᔭᐍᐏᐣ', start: 12.4 })
    expect(d.startsWith('attachment; filename="region-12s.mp3"; filename*=UTF-8\'\'')).toBe(true)
    expect(isLatin1(d)).toBe(true)
    expect(decodeURIComponent(d.split("UTF-8''")[1])).toBe('ᓀᐦᐃᔭᐍᐏᐣ.mp3')
  })

  it('strips accents for the fallback and keeps the real name in filename*', () => {
    const d = clipDisposition({ regionText: 'nêhiyawêwin', start: 0 })
    expect(d).toBe(`attachment; filename="nehiyawewin.mp3"; filename*=UTF-8''n%C3%AAhiyaw%C3%AAwin.mp3`)
  })

  it('leaves plain ASCII names as they are', () => {
    expect(clipDisposition({ regionText: 'Taanshi kiya?', start: 3 }))
      .toBe(`attachment; filename="Taanshi-kiya.mp3"; filename*=UTF-8''Taanshi-kiya.mp3`)
  })
})
