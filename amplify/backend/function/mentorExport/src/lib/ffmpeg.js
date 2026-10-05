const { exec } = require('child_process')
const { escapeShellArg } = require('../utils')

const runCommand = async (command) => {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 500 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Command failed: ${command}`, stderr)
        return reject(error)
      }
      resolve(stdout)
    })
  })
}

/**
 * Clip [start, end] seconds out of the rendition to a standalone 192k MP3.
 *
 * Fast input seek (`-ss`/`-t` BEFORE `-i`) avoids re-decoding the whole file from
 * zero for every clip — critical when a transcription has hundreds of regions.
 * Re-encoding (rather than stream-copy) makes the output universal: it works
 * whether the rendition is MP3 (audio source) or MP4/AAC (video source).
 */
async function clipRegion(renditionPath, startSeconds, endSeconds, outputPath) {
  const duration = Math.max(0, endSeconds - startSeconds)
  await runCommand(
    `ffmpeg -y -ss ${startSeconds} -t ${duration} -i ${escapeShellArg(renditionPath)} ` +
    `-vn -c:a libmp3lame -b:a 192k ${escapeShellArg(outputPath)}`
  )
  return outputPath
}

module.exports = { runCommand, clipRegion }
