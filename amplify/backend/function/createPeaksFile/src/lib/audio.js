const { exec } = require("child_process")
const fs = require("fs")
const { escapeShellArg } = require('../utils')

/**
 * Run a shell command
 * @param {string} command - Command to execute
 * @returns {Promise<void>}
 */
const runCommand = async (command) => {
  console.log(`Running command '${command}'`)
  return new Promise((resolve, reject) => {
    exec(command, {maxBuffer: 1024 * 500}, (error, stdout, stderr) => {
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

/**
 * Extract audio from video file
 * @param {string} inputPath - Path to input video file
 * @param {string} outputPath - Path for output audio file
 * @returns {Promise<string>} - Path to the extracted audio file
 */
const extractAudioFromVideo = async (inputPath, outputPath) => {
  await runCommand(`ffmpeg -i ${escapeShellArg(inputPath)} ${escapeShellArg(outputPath)}`)
  return outputPath
}

/**
 * Generate waveform data from audio file
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<string>} - Path to the generated JSON file
 */
const generateWaveform = async (audioPath) => {
  const datPath = `${audioPath}.dat`
  const jsonPath = `${audioPath}.json`
  
  // Generate waveform data
  await runCommand(`audiowaveform -i ${escapeShellArg(audioPath)} -o ${escapeShellArg(datPath)} --pixels-per-second 20`)
  
  // Convert to JSON
  await runCommand(`audiowaveform -i ${escapeShellArg(datPath)} -o ${escapeShellArg(jsonPath)}`)
  
  return jsonPath
}

/**
 * Process peaks data to normalize values
 * @param {string} jsonPath - Path to the JSON file with peaks data
 * @returns {Promise<object>} - Processed peaks data
 */
const processPeaksData = async (jsonPath) => {
  const rawPeaks = fs.readFileSync(jsonPath).toString()
  const parsed = JSON.parse(rawPeaks)
  
  if (!parsed.data || parsed.data.length === 0) {
    throw new Error('Array is empty or undefined')
  }
  
  // Find maximum value for normalization
  const max = Math.max(...parsed.data)
  console.log(`Max peak value: ${max}`)
  
  // Normalize data to 0-1 range with 2 decimal places
  parsed.data = parsed.data.map(value => {
    return Number(Number(value / max).toFixed(2))
  })
  
  return parsed
}

/**
 * Clean up temporary files
 * @param {string[]} filePaths - Array of file paths to delete
 */
const cleanupFiles = async (filePaths) => {
  const cleanupPromises = filePaths.map(filePath => {
    if (filePath && fs.existsSync(filePath)) {
      return runCommand(`rm -rf ${escapeShellArg(filePath)}`)
    }
    return Promise.resolve()
  })
  
  await Promise.allSettled(cleanupPromises)
}

/**
 * Check if file is a video format
 * @param {string} extension - File extension
 * @returns {boolean} - True if video format
 */
const isVideoFormat = (extension) => {
  const videoExtensions = ['mp4', 'm4v', 'm4a']
  return videoExtensions.includes(extension.toLowerCase())
}

module.exports = {
  runCommand,
  extractAudioFromVideo,
  generateWaveform,
  processPeaksData,
  cleanupFiles,
  isVideoFormat
}
