const { prioritizeParticles } = require('../lib/utils')

describe('prioritizeParticles', () => {
  it('places Ipc analyses first when mixed with other types', () => {
    const analyses = [
      'awa+N+A+Sg',
      'awa+Ipc',
      'awa+V+AI+Ind+Prs+3Sg'
    ]
    const result = prioritizeParticles(analyses)
    expect(result[0]).toBe('awa+Ipc')
  })

  it('places multiple Ipc analyses before non-Ipc', () => {
    const analyses = [
      'foo+V+AI',
      'foo+Ipc',
      'foo+N+A+Sg',
      'bar+Ipc'
    ]
    const result = prioritizeParticles(analyses)
    // Both Ipc should come first
    expect(result[0]).toContain('+Ipc')
    expect(result[1]).toContain('+Ipc')
    // Non-Ipc should come after
    expect(result[2]).not.toContain('+Ipc')
    expect(result[3]).not.toContain('+Ipc')
  })

  it('preserves order when all are Ipc', () => {
    const analyses = [
      'a+Ipc',
      'b+Ipc',
      'c+Ipc'
    ]
    const result = prioritizeParticles(analyses)
    expect(result).toEqual(['a+Ipc', 'b+Ipc', 'c+Ipc'])
  })

  it('preserves order when none are Ipc', () => {
    const analyses = [
      'word+V+AI+Ind+Prs+1Sg',
      'word+N+A+Sg',
      'word+V+TI+Ind+Prs+3Sg'
    ]
    const result = prioritizeParticles(analyses)
    expect(result).toEqual([
      'word+V+AI+Ind+Prs+1Sg',
      'word+N+A+Sg',
      'word+V+TI+Ind+Prs+3Sg'
    ])
  })

  it('handles empty array', () => {
    expect(prioritizeParticles([])).toEqual([])
  })

  it('handles single Ipc element', () => {
    expect(prioritizeParticles(['ekwa+Ipc'])).toEqual(['ekwa+Ipc'])
  })

  it('handles single non-Ipc element', () => {
    expect(prioritizeParticles(['nipaw+V+AI'])).toEqual(['nipaw+V+AI'])
  })

  it('handles real-world example: ekwa (common particle)', () => {
    // "ekwa" can be analyzed as both Ipc (and) and rarely as other forms
    const analyses = [
      'ekwa+N+A+Sg',
      'ekwa+Ipc'
    ]
    const result = prioritizeParticles(analyses)
    expect(result[0]).toBe('ekwa+Ipc')
  })
})
