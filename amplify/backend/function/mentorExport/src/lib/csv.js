// Pure helpers for building the Mentor import bundle. No I/O here so they can be
// unit-tested directly (see test/csv.test.js).

const CSV_HEADER = ['english', 'language', 'Speaker', 'audio_file']

// A region is exportable when it is not a note and carries at least one of the two
// text fields. Empty regions produce no useful CSV row and no clip.
function isExportableRegion(region) {
  if (region.isNote) return false
  const original = (region.regionText || '').trim()
  const translation = (region.translation || '').trim()
  return original.length > 0 || translation.length > 0
}

// Exportable regions, chronologically ordered (matches how the editor lists them).
function selectExportRegions(regions) {
  return regions.filter(isExportableRegion).sort((a, b) => a.start - b.start)
}

// Clip name with a 1-based, zero-padded sequence so files sort in start-time order
// on disk and in the CSV: "<transcriptionId>-region-0001.mp3". Padded to 4 digits
// (assumes < 10,000 regions per transcription, which is well beyond real transcripts).
function clipFileName(transcriptionId, sequence) {
  const padded = String(sequence).padStart(4, '0')
  return `${transcriptionId}-region-${padded}.mp3`
}

// Escape a single CSV field per RFC 4180: wrap in quotes when it contains a comma,
// quote, or newline, doubling any embedded quotes.
function escapeCsvField(value) {
  const str = value == null ? '' : String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsvRow(fields) {
  return fields.map(escapeCsvField).join(',')
}

/**
 * Build the full import.csv text.
 * Columns: english = translation, language = regionText (original), Speaker, audio_file.
 * @param {Array} regions - already selected + sorted exportable regions
 * @param {string} transcriptionId
 * @param {string} speaker
 */
function buildImportCsv(regions, transcriptionId, speaker) {
  const lines = [toCsvRow(CSV_HEADER)]
  regions.forEach((region, i) => {
    lines.push(toCsvRow([
      (region.translation || '').trim(),
      (region.regionText || '').trim(),
      speaker || '',
      clipFileName(transcriptionId, i + 1),
    ]))
  })
  // Trailing newline so the file ends cleanly.
  return lines.join('\n') + '\n'
}

module.exports = {
  CSV_HEADER,
  isExportableRegion,
  selectExportRegions,
  clipFileName,
  escapeCsvField,
  buildImportCsv,
}
