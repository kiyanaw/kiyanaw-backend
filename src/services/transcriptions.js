import UUID from 'uuid'
import { API, graphqlOperation, Storage } from 'aws-amplify'

import * as queries from '../graphql/queries'
import * as mutations from '../graphql/mutations'
import * as subscriptions from '../graphql/subscriptions'

import EnvService from '../services/env'
import UserService from './user'

import logging from '../logging'
const logger = new logging.Logger('Transcription Service')

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

// let createRegionSubscription = null
// let updateRegionSubscription = null
// let deleteRegionSubscription = null
const regionSubscribers = []

/**
 * @typedef {Object} Region
 * @property {Number} end End time of the region.
 * @property {Number} start Start time of the region.
 * @property {string} id ID of the region.
 * @property {Array<Object>} text List of text items in this region
 */

/**
 * @description Interface to the transcription document.
 */
// TODO: move this object into the store instead of the service
class Transcription {
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
    this.dateLastUpdated = data.dateLastUpdated
    this.userLastUpdated = data.userLastUpdated
    if (data.editor && data.editor.items) {
      this.editors = data.editor.items.map((item) => item.username)
      // need this so we have the ids of the editors for add/remove
      this.editorsDb = data.editor.items
    }
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
      const length = String(floatToMSM(this.data.length)).split('.')[0]
      return length
    } catch (error) {
      logger.warn('Error parsing length', error)
      return '0'
    }
  }
}

export default {
  async addInitialEditors() {
    const transcriptions = await this.oldListTransciptions()
    for (const item of transcriptions) {
      console.log(`Adding editor ${item.author} for ${item.id}`)
      try {
        await UserService.addTranscriptionEditor(item.id, item.author)
      } catch (error) {
        console.error(error)
      }
    }
  },

  async oldListTransciptions() {
    let results = []
    try {
      results = await API.graphql(graphqlOperation(queries.listTranscriptions, { limit: 100 }))
      // console.log(results)
    } catch (error) {
      console.error('Could not load transcriptions', error)
    }
    results = results.data.listTranscriptions.items
    return results
  },
  /**
   * Get a list of transcriptions.
   * @param {string} user Currently unused.
   * @returns {Promise<Array<Transcription>>}
   */
  // TODO: test me!
  // TODO: want these ordered by lastUpdated
  async listTranscriptions() {
    // transcriptions are attached to the user profile
    const profile = await UserService.getProfile()
    console.log('transcriptions', profile.transcriptions)
    let transcriptions = []
    if (profile.transcriptions.items) {
      transcriptions = profile.transcriptions.items.map(
        (item) => new Transcription(item.transcription),
      )
    }
    return transcriptions
  },

  /**
   * @typedef {Object} TranscriptionUpload
   * @property {Object} data
   * @property {File} data.file The file to upload
   * @property {string} data.title The title of the transcription to create
   */

  /**
   * Create a new transcription.
   * @param {TranscriptionUpload} data
   */
  async createTranscription(data, progressCallback = null) {
    const { file, title } = data
    const timestamp = `${+new Date()}`
    const fileResult = await Storage.put(`${timestamp}-${file.name}`, file, {
      ACL: 'public-read',
      expires: new Date('Wed, 31 Dec 2098 23:59:59 GMT'),
      cacheControl: 'max-age=3600000',
      progressCallback: progressCallback,
    })
    const key = fileResult.key
    const bucket = EnvService.getUserBucket()
    const source = `https://${bucket}.s3.amazonaws.com/public/${key}`
    const result = await this.createDocument({
      title,
      source,
      type: file.type,
    })
    const transcription = result.data.createTranscription

    // create link to editor
    await UserService.addTranscriptionEditor(transcription.id)

    return transcription
  },

  async getPeaksFile(filename) {
    return Storage.get(filename)
  },

  /** */
  async createDocument(data) {
    const user = await UserService.getUser()
    const id = UUID.v1().split('-')[0]
    const input = {
      title: data.title,
      source: data.source,
      type: data.type,
      author: user.name,
      userLastUpdated: user.name,
      issues: 0,
      length: 0,
      coverage: 0,
      id: id,
      dateLastUpdated: +new Date(),
      contributors: [],
    }
    return API.graphql(graphqlOperation(mutations.createTranscription, { input: input }))
  },

  /** */
  async getTranscription(id) {
    try {
      let [transcription, regions] = await Promise.all([
        API.graphql(graphqlOperation(queries.getTranscription, { id: id })),
        API.graphql(
          graphqlOperation(queries.byTranscription, { transcriptionId: id, limit: 2500 }),
          'AWS_IAM',
        ),
      ])
      transcription = new Transcription(transcription.data.getTranscription)
      transcription.regions = regions.data.byTranscription.items.map((item) => {
        item.text = JSON.parse(item.text)
        item.issues = item.issues ? JSON.parse(item.issues) : []
        item.comments = item.comments ? JSON.parse(item.comments) : []
        item.isNote = !!item.isNote
        return item
      })
      return transcription
    } catch (error) {
      console.warn('Could not load transcription', error)
      return null
    }
  },

  /** */
  async createRegion(transcriptionId, regionData) {
    const input = {
      id: regionData.id,
      start: regionData.start,
      end: regionData.end,
      text: JSON.stringify(regionData.text),
      dateLastUpdated: `${+new Date()}`,
      userLastUpdated: (await UserService.getUser()).name,
      transcriptionId: transcriptionId,
    }

    const update = await API.graphql(graphqlOperation(mutations.createRegion, { input: input }))
    // regionData.version = 1
    return update.data.createRegion
  },

  async updateRegion(transcriptionId, region) {
    const user = await UserService.getUser()
    const input = {
      id: region.id,
      start: region.start,
      end: region.end,
      text: JSON.stringify(region.text),
      issues: JSON.stringify(region.issues),
      translation: region.translation,
      isNote: !!region.isNote,
      dateLastUpdated: `${+new Date()}`,
      userLastUpdated: user.name,
      transcriptionId: transcriptionId,
      expectedVersion: region.version,
    }
    logger.debug('update region input', input)
    const update = await API.graphql(graphqlOperation(mutations.updateRegion, { input: input }))
    region.version = region.version + 1
    return update.data.updateRegion
  },

  async deleteRegion(transcriptionId, region) {
    await API.graphql(
      graphqlOperation(
        mutations.deleteRegion,
        {
          input: {
            id: region.id,
            expectedVersion: region.version,
          },
        },
        { authMode: 'AWS_IAM' },
      ),
    )
    return true
  },

  async listenForRegions(callback) {
    const user = await UserService.getUser()
    if (!this.createRegionSubscription) {
      this.createRegionSubscription = API.graphql(
        graphqlOperation(subscriptions.onCreateRegion),
      ).subscribe({
        next: (lockData) => {
          const data = lockData.value.data.onCreateRegion
          // console.log('incoming region', data, user)
          // console.log('Region locked by another user: ', data)
          for (const subscriber of regionSubscribers) {
            const region = data
            if (typeof region.text === 'string') {
              region.text = JSON.parse(region.text)
            }
            subscriber('created', region)
          }
        },
        error: (error) => {
          console.warn('Unable to listen for region create', error)
        },
      })
    }
    if (!this.updateRegionSubscription) {
      this.updateRegionSubscription = API.graphql(
        graphqlOperation(subscriptions.onUpdateRegion),
      ).subscribe({
        next: (lockData) => {
          const data = lockData.value.data.onUpdateRegion
          // console.log('incoming region', data, user)
          if (data.userLastUpdated !== user.name) {
            for (const subscriber of regionSubscribers) {
              const region = data
              if (typeof region.text === 'string') {
                region.text = JSON.parse(region.text)
              }
              subscriber('updated', region)
            }
          }
        },
        error: (error) => {
          console.warn('Unable to listen for region update', error)
        },
      })
    }
    if (!this.deleteRegionSubscription) {
      this.deleteRegionSubscription = API.graphql(
        graphqlOperation(subscriptions.onDeleteRegion),
      ).subscribe({
        next: (lockData) => {
          const data = lockData.value.data.onDeleteRegion
          // console.log('incoming region', data, user)
          if (data.userLastUpdated !== user.name) {
            for (const subscriber of regionSubscribers) {
              const region = data
              if (typeof region.text === 'string') {
                region.text = JSON.parse(region.text)
              }
              subscriber('deleted', region)
            }
          }
        },
        error: (error) => {
          console.warn('Unable to listen for region delete', error)
        },
      })
    }
    regionSubscribers.push(callback)
  },

  /** */
  async updateTranscription(data) {
    logger.debug('saving transcription', data)
    const update = await API.graphql(
      graphqlOperation(mutations.updateTranscription, { input: data }),
    )
    return update.data.updateTranscription
  },
}
