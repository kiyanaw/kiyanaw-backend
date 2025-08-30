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
  
  console.log(`Processing peaks data with ${parsed.data.length} elements`)
  
  // Find maximum value for normalization (avoid spread operator for large arrays)
  const max = getMaxValue(parsed.data)
  console.log(`Max peak value: ${max}`)
  
  // Normalize data using chunked processing to avoid stack overflow
  parsed.data = processLargeArray(parsed.data, max)
  
  return parsed
}

/**
 * Find maximum value in array without using spread operator
 * @param {number[]} arr - Array of numbers
 * @returns {number} - Maximum value
 */
const getMaxValue = (arr) => {
  let max = arr[0]
  for (let i = 1; i < arr.length; i++) {
    if (max < arr[i]) {
      max = arr[i]
    }
  }
  return max
}

/**
 * Process large array in chunks to avoid stack overflow
 * @param {number[]} data - Array to process
 * @param {number} max - Maximum value for normalization
 * @returns {number[]} - Processed array
 */
const processLargeArray = (data, max) => {
  const chunkSize = 10000
  const result = []
  
  for (let i = 0; i < data.length; i += chunkSize) {
    const endIndex = Math.min(i + chunkSize, data.length)
    
    // Process chunk without using .map() to avoid stack issues
    for (let j = i; j < endIndex; j++) {
      result[j] = Number(Number(data[j] / max).toFixed(2))
    }
    
    // Log progress for large arrays (every 50k elements)
    if (i % 50000 === 0 && i > 0) {
      console.log(`Processed ${endIndex} / ${data.length} elements`)
    }
  }
  
  console.log(`Completed processing ${result.length} elements`)
  return result
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
