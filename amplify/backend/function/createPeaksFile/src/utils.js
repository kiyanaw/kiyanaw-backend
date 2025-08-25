const okResponse = () => {
  return {
    statusCode: 200,
    body: '{"message": "ok"}',
  }
}

/**
 * Escape shell arguments to prevent command injection
 * @param {string} arg - The argument to escape
 * @returns {string} - The escaped argument
 */
const escapeShellArg = (arg) => {
  return `'${arg.replace(/'/g, "'\"'\"'")}'`
}

/**
 * Find the maximum value in an array
 * @param {number[]} arr - Array of numbers
 * @returns {number} - The maximum value
 */
const getMax = (arr) => {
  if (!arr || arr.length === 0) {
    throw new Error('Array is empty or undefined')
  }
  
  let max = arr[0]
  for (let i = 1; i < arr.length; i++) {
    if (max < arr[i]) {
      max = arr[i]
    }
  }
  return max
}

/**
 * Parse S3 URL to extract bucket and key information
 * @param {string} url - S3 URL
 * @returns {object} - Object with bucket, key, filename, and filebits
 */
const parseS3Url = (url) => {
  if (!url || typeof url !== 'string') {
    throw new Error('URL is required and must be a string')
  }
  
  if (url.indexOf('s3.amazonaws.com') === -1) {
    throw new Error(`URL unexpected, should be coming from AWS: ${url}`)
  }
  
  const parts = url.split('/')
  if (parts.length < 5) {
    throw new Error(`Invalid S3 URL format: ${url}`)
  }
  
  const [, , domain, ...pathParts] = parts
  const filename = pathParts[pathParts.length - 1]
  const folder = pathParts.slice(0, -1).join('/')
  const key = pathParts.join('/')
  const filebits = filename.split('.')
  const bucket = domain.split('.')[0]
  
  if (filebits.length < 2) {
    throw new Error(`Filename must have extension: ${filename}`)
  }
  
  // For filenames with multiple periods, treat everything after the last period as the extension
  const extension = filebits[filebits.length - 1]
  const name = filebits.slice(0, -1).join('.')
  
  return {
    bucket,
    key,
    filename,
    filebits: [name, extension],
    folder
  }
}

module.exports = {
  okResponse,
  escapeShellArg,
  getMax,
  parseS3Url
}
