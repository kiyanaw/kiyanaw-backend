import logging from '../logging'
const logger = new logging.Logger('Transcription Model')

function pad(num, size) {
  return ('000000000' + num).substr(-size)
}

function floatToMSM(value) {
  const stringFloat = `${value}`
  const [rawSecs, rawMillis] = stringFloat.split('.')
  let minutes = Math.floor(rawSecs / 60)
  if (minutes < 10) {
    minutes = `0${minutes}`
  }
  const seconds = rawSecs % 60
  let millis = Number(`${rawMillis}`.substr(0, 2))
  if (`${millis}`.length === 1) {
    millis = `${millis}0`
  }
  if (`${millis}`.length === 2) {
    millis = `${millis}`
  }
  return `${minutes}:${pad(seconds, 2)}.${millis || '00'}`
}

class TranscriptionModel {
  constructor(data) {
    this.id = data.id
    this.data = data
    this.title = data.title
    this.comments = data.comments
    this.author = data.author
    this.type = data.type
    this.issues = Number(data.issues) || 0
    this.source = data.source
    this.coverage = data.coverage || 0
    this.isPrivate = data.isPrivate || false
    this.disableAnalyzer = !!data.disableAnalyzer
    this.dateLastUpdated = data.dateLastUpdated
    this.userLastUpdated = data.userLastUpdated
    this.isVideo = data.type.includes('video')
    this.peaksData = null
    // editors are loaded dynamically
    data.contributors.toArray().then((items) => {
      this.editors = items.map((item) => item.contributorID)
    })

    // private values
    this._length = data.length
  }

  /**
   * Provide the URL to edit the transcription.
   * @returns {string}
   */
  get url() {
    return '/transcribe-edit/' + this.id
  }

  /**
   * Provide the length of the transcription audio in MM:SS
   * @returns {string}
   */
  get length() {
    try {
      const length = String(floatToMSM(this._length)).split('.')[0]
      return length
    } catch (error) {
      logger.warn('Error parsing length', error)
      return '0'
    }
  }

  set length(value) {
    this._length = value
  }

  /**
   * Get peaks data to render waveform.
   * @returns {Object}
   */
  get peaks() {
    return this.peaksData
  }

  /**
   * Set peaks data.
   */
  set peaks(data) {
    this.peaksData = data
  }
}

// TODO: test this
class RegionModel {
  constructor(data) {
    try {
      this.id = data.id 
      this.createdAt = data.createdAt
      this.dateLastUpdated = data.dateLastUpdated
      this.end = data.end
      this.isNote = !!data.isNote

      // comments 
      if (data.comments && data.comments !== '') {
        this.comments = typeof data.comments === 'string' ? 
          JSON.parse(data.comments) : data.comments
      } else {
        this.comments = []
      }

      // text - handle both old and new format
      if (data.regionText) {
        this.text = [{ insert: data.regionText }]
      } else if (data.text && data.text !== '--not used--') {
        this.text = typeof data.text === 'string' ? 
          JSON.parse(data.text) : data.text
      } else {
        this.text = []
      }

      // issues are now handled in a separate table
      this.issues = []

      this.start = data.start
      this.transcriptionId = data.transcriptionId
      this.translation = data.translation || ''
      this.userLastUpdated = data.userLastUpdated

      // indexes
      this.displayIndex = data.displayIndex
      this.index = data.index

    } catch (e) {
      console.error('Error constructing RegionModel:', e);
      console.error('Data:', JSON.stringify(data, null, 2));
      throw e;
    }
  }
}

export default {
  RegionModel,
  TranscriptionModel,
}
