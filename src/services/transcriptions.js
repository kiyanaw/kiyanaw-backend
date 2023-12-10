import UUID from 'uuid'
import { API, graphqlOperation, Storage } from 'aws-amplify'

// import * as queries from '../graphql/queries'
import * as mutations from '../graphql/mutations'
// import * as subscriptions from '../graphql/subscriptions'

import EnvService from '../services/env'
import UserService from './user'

import logging from '../logging'
const logger = new logging.Logger('Transcription Service')



export default {
  /**
   * Get a list of transcriptions.
   * @param {string} user Currently unused.
   * @returns {Promise<Array<Transcription>>}
   */
  // TODO: test me!
  // TODO: want these ordered by lastUpdated
  // async listTranscriptions() {
  //   // transcriptions are attached to the user profile
  //   const profile = await UserService.getProfile()
  //   console.log('transcriptions', profile.transcriptions)
  //   let transcriptions = []
  //   if (profile.transcriptions.items) {
  //     transcriptions = profile.transcriptions.items.map(
  //       (item) => new Transcription(item.transcription),
  //     )
  //   }

  //   return transcriptions
  // },

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

  async uploadMediaFile(inputFile, progressCallback = null) {
    const timestamp = `${+new Date()}`
    const fileName = inputFile.name.replace(/[^a-zA-Z0-9.]/g,'-')
    const fileResult = await Storage.put(`${timestamp}-${fileName}`, inputFile, {
      ACL: 'public-read',
      expires: new Date('Wed, 31 Dec 2098 23:59:59 GMT'),
      cacheControl: 'max-age=3600000',
      progressCallback: progressCallback,
    })
    return fileResult
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
      disableAnalyzer: false,
      isPrivate: false,
    }
    return API.graphql(graphqlOperation(mutations.createTranscription, { input: input }))
  },

  // /** */
  // async getTranscription(id) {
  //   console.log(id)
  //   // try {
  //   //   let [transcription, regions] = await Promise.all([
  //   //     API.graphql(graphqlOperation(queries.getTranscription, { id: id })),
  //   //     API.graphql(
  //   //       graphqlOperation(queries.byTranscription, { transcriptionId: id, limit: 2500 }),
  //   //     ),
  //   //   ])

  //   //   console.log('raw transcription', transcription)
  //   //   transcription = new Transcription(transcription.data.getTranscription)
  //   //   transcription.regions = regions.data.byTranscription.items.map((item) => {
  //   //     item.text = JSON.parse(item.text)
  //   //     item.issues = item.issues ? JSON.parse(item.issues) : []
  //   //     item.comments = item.comments ? JSON.parse(item.comments) : []
  //   //     item.isNote = !!item.isNote
  //   //     return item
  //   //   })
  //   //   return transcription
  //   // } catch (error) {
  //   //   console.warn('Could not load transcription', error)
  //   //   return null
  //   // }
  // },

  // /** */
  // async createRegion(/*transcriptionId, regionData*/) {
  //   // const input = {
  //   //   id: regionData.id,
  //   //   start: regionData.start,
  //   //   end: regionData.end,
  //   //   text: JSON.stringify(regionData.text),
  //   //   dateLastUpdated: `${+new Date()}`,
  //   //   userLastUpdated: (await UserService.getUser()).name,
  //   //   transcriptionId: transcriptionId,
  //   // }

  //   // const update = await API.graphql(graphqlOperation(mutations.createRegion, { input: input }))
  //   // // regionData.version = 1
  //   // return update.data.createRegion
  // },

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
      _version: region._version,
    }
    logger.debug('update region input', input)
    const update = await API.graphql(graphqlOperation(mutations.updateRegion, { input: input }))
    region.version = region.version + 1
    return update.data.updateRegion
  },

  async deleteRegion(transcriptionId, region) {
    await API.graphql(
      graphqlOperation(mutations.deleteRegion, {
        input: {
          id: region.id,
          expectedVersion: region.version,
        },
      }),
    )
    return true
  },

  // async listenForRegions(callback) {
  //   console.log('Listening for regions')
  //   const user = await UserService.getUser()
  //   if (!this.createRegionSubscription) {
  //     this.createRegionSubscription = API.graphql(
  //       graphqlOperation(subscriptions.onCreateRegion),
  //     ).subscribe({
  //       next: (lockData) => {
  //         const data = lockData.value.data.onCreateRegion
  //         // console.log('incoming region', data, user)
  //         // console.log('Region locked by another user: ', data)
  //         for (const subscriber of regionSubscribers) {
  //           const region = data
  //           if (typeof region.text === 'string') {
  //             region.text = JSON.parse(region.text)
  //           }
  //           subscriber('created', region)
  //         }
  //       },
  //       error: (error) => {
  //         console.warn('Unable to listen for region create', error)
  //       },
  //     })
  //   }
  //   if (!this.updateRegionSubscription) {
  //     this.updateRegionSubscription = API.graphql(
  //       graphqlOperation(subscriptions.onUpdateRegion),
  //     ).subscribe({
  //       next: (lockData) => {
  //         const data = lockData.value.data.onUpdateRegion
  //         // console.log('incoming region', data, user)
  //         if (data.userLastUpdated !== user.name) {
  //           for (const subscriber of regionSubscribers) {
  //             const region = data
  //             if (typeof region.text === 'string') {
  //               region.text = JSON.parse(region.text)
  //             }
  //             subscriber('updated', region)
  //           }
  //         }
  //       },
  //       error: (error) => {
  //         console.warn('Unable to listen for region update', error)
  //       },
  //     })
  //   }
  //   if (!this.deleteRegionSubscription) {
  //     this.deleteRegionSubscription = API.graphql(
  //       graphqlOperation(subscriptions.onDeleteRegion),
  //     ).subscribe({
  //       next: (lockData) => {
  //         const data = lockData.value.data.onDeleteRegion
  //         // console.log('incoming region', data, user)
  //         if (data.userLastUpdated !== user.name) {
  //           for (const subscriber of regionSubscribers) {
  //             const region = data
  //             if (typeof region.text === 'string') {
  //               region.text = JSON.parse(region.text)
  //             }
  //             subscriber('deleted', region)
  //           }
  //         }
  //       },
  //       error: (error) => {
  //         console.warn('Unable to listen for region delete', error)
  //       },
  //     })
  //   }
  //   regionSubscribers.push(callback)
  // },

  /** */
  async updateTranscription(data) {
    logger.info('saving transcription', data)
    data = {
      ...data,
    }
    delete data.version
    const update = await API.graphql(
      graphqlOperation(mutations.updateTranscription, { input: data }),
    )
    return update.data.updateTranscription
  },
}
