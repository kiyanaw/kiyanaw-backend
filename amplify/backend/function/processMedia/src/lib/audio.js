const { exec } = require('child_process')
const fs = require('fs')
const { escapeShellArg } = require('../utils')

const runCommand = async (command) => {
  console.log(`Running command '${command}'`)
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 500 }, (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`)
        reject(error)
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`)
      }
      console.log(`stdout: ${stdout}`)
      resolve()
    })
  })
}

const generateWaveform = async (audioPath) => {
  const wavPath = `${audioPath}.wav`
  const jsonPath = `${audioPath}.json`

  await runCommand(`ffmpeg -y -i ${escapeShellArg(audioPath)} -acodec pcm_s16le -ar 44100 -ac 1 ${escapeShellArg(wavPath)}`)
  await runCommand(`audiowaveform -i ${escapeShellArg(wavPath)} -o ${escapeShellArg(jsonPath)} --pixels-per-second 20`)

  if (fs.existsSync(wavPath)) {
    fs.unlinkSync(wavPath)
  }

  return jsonPath
}

const processPeaksData = async (jsonPath) => {
  const rawPeaks = fs.readFileSync(jsonPath).toString()
  const parsed = JSON.parse(rawPeaks)

  if (!parsed.data || parsed.data.length === 0) {
    throw new Error('Peaks array is empty or undefined')
  }

  const max = getMaxValue(parsed.data)
  if (max === 0) {
    return parsed
  }

  parsed.data = processArrayInChunks(parsed.data, max)
  return parsed
}

const getMaxValue = (arr) => {
  let max = arr[0]
  for (let i = 1; i < arr.length; i++) {
    if (max < arr[i]) max = arr[i]
  }
  return max
}

const processArrayInChunks = (data, max) => {
  const chunkSize = 5000
  const result = new Array(data.length)
  for (let i = 0; i < data.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, data.length)
    for (let j = i; j < end; j++) {
      result[j] = Math.round((data[j] / max) * 100) / 100
    }
  }
  return result
}

module.exports = { runCommand, generateWaveform, processPeaksData }
