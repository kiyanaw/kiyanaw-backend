
const doLog = true

const OldLogger = function (namespace) {
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

const Logger = function (klass, state) {
  this.debug = {}

  state = true // TODO: re-enable this for class-level enable/disable

  // if (state && klass.isDebug) {
  if (state) {
    for (const m in console)
      if (typeof console[m] == 'function')
        this.debug[m] = console[m].bind(window.console, `[${m.toUpperCase()}] ` + klass.toString() + ': ')
  } else {
    for (const m in console) if (typeof console[m] == 'function') this.debug[m] = function () {}
  }
  return this.debug
}

export default { Logger, OldLogger }
