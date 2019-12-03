const assert = require('assert')
const fs = require('fs')
const path = require('path')
const process = require('child_process')
const toSyllabics = require('cree-sro-syllabics')
const axios = require('axios')
const uuid = require('uuid')

const paradigmTemplates = require('./generate-layouts').buildParadigmTemplates()

// delete index curl -XDELETE https://search-kiyanaw-dev-grohpnfdchux2gvdyytpdpqr5m.us-east-1.es.amazonaws.com/inflected
// mapping curl -XPUT -H'Content-Type: application/json' -d'{"mappings": {"properties":{"inflected":{"type":"keyword", "index": true}, "lemma": {"type": "nested", "properties": {"sro": {"type": "keyword", "index": true}}}}}}' https://search-kiyanaw-dev-grohpnfdchux2gvdyytpdpqr5m.us-east-1.es.amazonaws.com/inflected

const esUrl = 'https://search-kiyanaw-dev-grohpnfdchux2gvdyytpdpqr5m.us-east-1.es.amazonaws.com'
const tempFile = `/tmp/inflected-${+new Date()}`
const inFile = 'verb_stems.lexc'
// const esUrl = 'http://localhost:9200'
const creeWords = fs.readFileSync(path.join(__dirname, 'cree-words', inFile), 'utf-8')

const formDetails = {
  'Present Independent': {
    name: 'Present Independent',
    translation: null,
    notes: 'The independent mode can be used to form a new context, or independently as a complete sentence.'
  },
  'Present Conjunct': {
    name: 'Present Conjunct (ê-)',
    translation: 'as, which, ...ing',
    notes: 'The conjunct mode (or subjunct mode) can be often used in casual conversation when the context is known. Sometimes called the "ing" style of speaking, conjunct can also mean "as" as in "as I eat". Formally, conjunct is often used with an independent phrase to complete an idea or statement.'
  },
  'Past Independent': {
    name: 'Past Independent (-kî-)',
    translation: null,
    description: 'Used to denote those things which have happened in the past.'
  },
  'Past Conjunct': {
    name: 'Past Conjunct (ê-kî-)',
    translation: ''
  }
}

async function main() {
  // clear out the index

  // start parsing words
  let lines = creeWords.split(/\r?\n/)
  lines = lines.filter(line => !line.startsWith('!') && line.endsWith(';'))
  const total = lines.length

  // this line is for testing, shortens the array
  lines = lines.slice(0, 1)

  let count = 0
  for (const line of lines) {
    count += 1
    const [lemmaImp, aewType] = line.split(' ')
    const [lemma, notUsed] = lemmaImp.split(':')
    console.log(`Lemma: ${lemma} (${count}/${total})`)
    const verbType = aewType.substring(0, 3)
    const lookupVerbString = `V+${verbType.substring(1, 3)}` // V+AI
    const thisVerbsParadigms = paradigmTemplates[verbType]
    const paradigmStrings = Object.keys(thisVerbsParadigms)
    // loop over the possible paradigms and generate them

    const originalFstIdsLookup = {}

    // ['Imp+Del+2Pl+3PlO', 'Imp+Del+2Pl+3PlO', 'Imp+Del+2Pl+3PlO', ]

    const fstInput = paradigmStrings.map((form) => {
      const lookupLemma = `${lemma}+${lookupVerbString}` // lemma+V+AI
      // independent lookup string
      let lookup = `${lookupLemma}+${form}` // lemma+V+AI+Ind+Prs+3Sg
      if (form.indexOf('*') > -1) {
        lookup = form.replace('*', lookupLemma)
      }
      originalFstIdsLookup[lookup] = form
      return lookup
    }).join('\n')

    console.log(fstInput)

    const rawOutput = process.execSync(`echo '${fstInput}' | hfst-optimized-lookup --silent crk-normative-generator.hfstol 2>&1`).toString()
    console.log(rawOutput.toString())
    const processedOutput = rawOutput.split('\n')
      .filter((line) => !line.startsWith('!') && line)
      .map((line) => line.split(/\s+/))

    // process the raw output, map it to a lookup
    // clear the output file
    process.execSync(`echo '' > ${tempFile}`)
    // const wordList = []
    for (const inflectionPair of processedOutput) {
      if (inflectionPair.includes('+?')) {
        // this form didn't look up
        console.warn(`Unknown lookup: ${inflectionPair[0]}`)
        continue
      }

      // inflectionPair looks like this
      // ['acâhkosiwiw+V+AI+Ind+Prs+2Sg', 'kitacâhkosiwin']

      // TODO: add a lemma: true flag to the proper forms
      const [analysis, inflected] = inflectionPair
      const originalForm = originalFstIdsLookup[analysis]
      const template = paradigmTemplates[verbType][originalForm]
      const final = {
        ...template,
        // TODO: rename this to 'final' for consistency
        inflected,
        alternate: toSyllabics.sro2syllabics(inflected),
        language: 'nêhiyawêwin',
        dialect: 'Southern Plains (Y)',
        translation: 'TODO',
        lemma: {
          sro: lemma,
          translation: 'TODO'
        },
        fstIdentifier: analysis,
        form: {
          name: 'TODO',
          description: 'TODO',
          notes: 'TODO'
        }
      }
      assert.ok(final.tempus && final.mode)
      // for the bulk api, create the operation doc
      const op = { create: { _index: 'inflected', _id: uuid.v1() } }
      // wordList.push(final)
      // console.log(final)
      // console.log(final.tempus, final.mode, inflected)
      // console.log(`${JSON.stringify(final)}`)

      // TODO: some of these are undefined undefined ??

      // console.log(`${final.tempus} ${final.mode}`)
      // const updated = await axios({
      //   method: 'post',
      //   url: `${esUrl}/inflected/items`,
      //   headers: { 'Content-Type': 'application/json' },
      //   data: final
      // })
      // assert.ok(updated.status === 201)
      process.execSync(`echo '${JSON.stringify(op)}' >> ${tempFile}`)
      process.execSync(`echo '${JSON.stringify(final)}' >> ${tempFile}`)
    }
    // process.execSync(`echo '${wordList.map(item => JSON.stringify(item)).join('\n')}' > ${tempFile}`)
    // const out = process.execSync(`curl -s -H "Content-Type: application/x-ndjson" -XPOST ${esUrl}/_bulk --data-binary "@${tempFile}"; echo`)
    // console.log(out.toString())
  }
}

main()
