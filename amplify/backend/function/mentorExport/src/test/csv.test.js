const {
  isExportableRegion,
  selectExportRegions,
  clipFileName,
  escapeCsvField,
  buildImportCsv,
} = require('../lib/csv')

describe('isExportableRegion', () => {
  it('excludes note regions', () => {
    expect(isExportableRegion({ isNote: true, regionText: 'Taanshi', translation: 'Hello' })).toBe(false)
  })

  it('excludes empty regions', () => {
    expect(isExportableRegion({ regionText: '   ', translation: '' })).toBe(false)
    expect(isExportableRegion({})).toBe(false)
  })

  it('includes a region with only original text', () => {
    expect(isExportableRegion({ regionText: 'Taanshi' })).toBe(true)
  })

  it('includes a region with only a translation', () => {
    expect(isExportableRegion({ translation: 'Hello' })).toBe(true)
  })
})

describe('selectExportRegions', () => {
  it('drops non-exportable regions and sorts by start time', () => {
    const regions = [
      { id: 'c', start: 5, regionText: 'Third' },
      { id: 'note', start: 1, isNote: true, regionText: 'Note' },
      { id: 'a', start: 1, regionText: 'First' },
      { id: 'empty', start: 2, regionText: '' },
      { id: 'b', start: 3, translation: 'Second' },
    ]
    expect(selectExportRegions(regions).map(r => r.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('clipFileName', () => {
  it('zero-pads the sequence to 4 digits so clips sort in order', () => {
    expect(clipFileName('trans-1', 1)).toBe('trans-1-region-0001.mp3')
    expect(clipFileName('trans-1', 42)).toBe('trans-1-region-0042.mp3')
    expect(clipFileName('trans-1', 1234)).toBe('trans-1-region-1234.mp3')
  })
})

describe('escapeCsvField', () => {
  it('leaves plain text untouched', () => {
    expect(escapeCsvField('Hello')).toBe('Hello')
  })

  it('quotes and doubles quotes when a comma or quote is present', () => {
    expect(escapeCsvField('How are you, friend?')).toBe('"How are you, friend?"')
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""')
  })

  it('quotes text containing newlines', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"')
  })

  it('renders null/undefined as empty', () => {
    expect(escapeCsvField(null)).toBe('')
    expect(escapeCsvField(undefined)).toBe('')
  })
})

describe('buildImportCsv', () => {
  it('maps english=translation, language=regionText, and fills speaker + filename', () => {
    const regions = [
      { id: 'r1', start: 0, regionText: 'Taanshi', translation: 'Hello' },
      { id: 'r2', start: 1, regionText: 'Eeyiweehk.', translation: 'So-so, fair to middling.' },
    ]
    const csv = buildImportCsv(regions, 'T1', 'Terry Ireland')
    const lines = csv.trim().split('\n')

    expect(lines[0]).toBe('english,language,Speaker,audio_file')
    expect(lines[1]).toBe('Hello,Taanshi,Terry Ireland,T1-region-0001.mp3')
    // Comma in the english field must be quoted.
    expect(lines[2]).toBe('"So-so, fair to middling.",Eeyiweehk.,Terry Ireland,T1-region-0002.mp3')
  })

  it('ends with a trailing newline', () => {
    const csv = buildImportCsv([{ id: 'r1', start: 0, regionText: 'x', translation: 'y' }], 'T1', '')
    expect(csv.endsWith('\n')).toBe(true)
  })
})
