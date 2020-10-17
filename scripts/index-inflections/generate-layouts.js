/**
 * This file takes the `full layout` files from langtech and puts them in JSON
 * format so we can process verbs based on
 */
const fs = require('fs')
const path = require('path')

// const pathToLayouts = '/Users/aaronfay/sandbox/langtech.old/trunk/langs/crk/inc/paradigms'
const paradigms = {}

// build out VAI layout csv to JSON file
function buildParadigmTemplatesForType(verbType) {
  const verbLayouts = fs.readFileSync(
    path.join(__dirname, 'layouts', `verb-${verbType}-full.layout`),
    'utf-8'
  )
  const type = 'Verb'

  // transform `ai` to `VAI`
  verbType = `V${verbType.toUpperCase()}`
  paradigms[verbType] = paradigms[verbType] || {}

  let transitivity = 'Intransitive'
  if (['ta', 'ti'].includes(verbType)) {
    transitivity = 'Transitive'
  }

  let animacy = 'Inanimate'
  if (['ta', 'ai'].includes(verbType)) {
    animacy = 'Animate'
  }

  let tempusHeader = ''
  let modeAHeader = ''
  let modeBHeader = ''

  for (const line of verbLayouts.split(/\r?\n/)) {
    if (line.startsWith('|')) {
      const bits = line.split('|')
      const part1 = bits[1].trim()
      const part2 = bits[2].trim()
      const part3 = bits[3].trim()

      const hasTempusHeader = !part1 && part2 && !part3 && !part2.startsWith(':')
      const hasModeAHeader = part2.startsWith(':')
      const hasModeBHeader = part3.startsWith(':')
      const hasPronoun = part1.startsWith('"')

      if (hasTempusHeader) {
        tempusHeader = part2
          .replace(/"/g, '')
          .replace('TENSE', '')
          .toLowerCase()
        tempusHeader = (tempusHeader.charAt(0).toUpperCase() + tempusHeader.slice(1)).trim()
        // we have a new tempus header, reset the mode headers
        modeAHeader = ''
        modeBHeader = ''
      }

      if (hasModeAHeader) {
        modeAHeader = part2
          .replace(/"/g, '')
          .replace(':', '')
          .trim()
      }

      if (hasModeBHeader) {
        modeBHeader = part3
          .replace(/"/g, '')
          .replace(':', '')
          .trim()
      }

      if (hasPronoun && !hasModeAHeader) {
        const participants = part1.replace(/"/g, '')
        const hasLayoutALine = part2 !== ''
        const hasLayoutBLine = part3 !== ''

        // TODO; assert values are within expected types
        if (hasLayoutALine) {
          if (modeAHeader === '') {
            // this is probably future conditional
            modeAHeader = 'Future'
          }
          const layoutALine = part2.replace(/"/g, '')
          paradigms[verbType][layoutALine] = {
            tempus: tempusHeader,
            // TODO: linguists call this 'order'
            mode: modeAHeader,
            paradigm: layoutALine,
            participants,
            animacy,
            transitivity,
            type
          }
        }
        if (hasLayoutBLine) {
          const layoutBLine = part3.replace(/"/g, '')
          paradigms[verbType][layoutBLine] = {
            tempus: tempusHeader,
            mode: modeBHeader,
            paradigm: layoutBLine,
            participants,
            animacy,
            transitivity,
            type
          }
        }
      }
    }
  }
}

function buildParadigmTemplates() {
  buildParadigmTemplatesForType('ai')
  buildParadigmTemplatesForType('ii')
  buildParadigmTemplatesForType('ti')
  buildParadigmTemplatesForType('ta')
  return paradigms
}

console.log(JSON.stringify(buildParadigmTemplates()))
// console.log(Object.keys(paradigms))

module.exports = {
  buildParadigmTemplatesForType,
  buildParadigmTemplates
}
