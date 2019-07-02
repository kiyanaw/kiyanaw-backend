function pad(num, size) {
  return ('000000000' + num).substr(-size)
}

export default {
  floatToMSM (value) {
    const stringFloat = `${value}`
    const [rawSecs, rawMillis] = stringFloat.split('.')
    const minutes = Math.floor(rawSecs / 60)
    const seconds = rawSecs % 60
    let millis = Number(`${rawMillis}`.substr(0,2))
    if (`${millis}`.length === 1) { millis = `${millis}0`}
    if (`${millis}`.length === 2) { millis = `${millis}`}
    return `${minutes}:${pad(seconds, 2)}.${millis || '00'}`
  }
}