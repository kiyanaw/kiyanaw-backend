const envLogging = process.env.NODE_LOGGING

const doLog = envLogging === 'off' ? false : true

const Logger = function (namespace) {
  const name = namespace || '<unset>'
  this.info = function () {
    /* eslint-disable no-undef */
    doLog && console.log('[INFO]', name, ':', ...arguments)
  }
  // alias of 'info' for drop-in support
  this.log = function () {
    doLog && console.log('[INFO]', name, ':', ...arguments)
  }
  this.warn = function () {
    doLog && console.warn('[WARN]', name, ':', ...arguments)
  }
  this.error = function () {
    doLog && console.error('[ERROR]', name, ':', ...arguments)
  }
  this.debug = function () {
    doLog && console.debug('[DEBUG]', name, ':', ...arguments)
  }
  return this
}

export default { Logger }
