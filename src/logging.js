const Logger = function (namespace) {
  const name = namespace || '<unset>'
  this.info = function () {
    /* eslint-disable no-undef */
    console.log('[INFO]', name, ':', ...arguments)
  }
  // alias of 'info' for drop-in support
  this.log = function () {
    console.log('[INFO]', name, ':', ...arguments)
  }
  this.warn = function () {
    console.warn('[WARN]', name, ':', ...arguments)
  }
  this.error = function () {
    console.error('[ERROR]', name, ':', ...arguments)
  }
  this.debug = function () {
    console.debug('[DEBUG]', name, ':', ...arguments)
  }
  return this
}

export default { Logger }
