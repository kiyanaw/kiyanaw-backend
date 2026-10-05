const { callerId, canClip, sanitizeStem, clipDownloadName } = require('../lib/clip-auth')

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
