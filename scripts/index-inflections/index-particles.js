// const assert = require('assert')
const fs = require('fs')
const path = require('path')
const process = require('child_process')
const toSyllabics = require('cree-sro-syllabics')

// const uuid = require('uuid')

const esUrl = 'https://search-kiyanaw-dev-grohpnfdchux2gvdyytpdpqr5m.us-east-1.es.amazonaws.com'

const inFile = 'particles.lexc'
const creeWords = fs.readFileSync(path.join(__dirname, 'cree-words', inFile), 'utf-8')

async function main () {
  let lines = creeWords.split(/\r?\n/)
  for (const particle of lines) {
    const final = {
      inflected: particle,
      alternate: toSyllabics.sro2syllabics(particle),
      language: 'nêhiyawêwin',
      dialect: 'Southern Plains (Y)',
      translation: 'TODO',
      type: 'Particle'
    }
    const out = process.execSync(`curl -s -H "Content-Type: application/json" -d'${JSON.stringify(final)}' -XPOST ${esUrl}/inflected/_doc`)
    console.log(out.toString())
  }
}

main()
