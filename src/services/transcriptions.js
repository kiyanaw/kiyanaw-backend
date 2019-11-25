import AWS from 'aws-sdk'
import { Storage } from 'aws-amplify'
import UUID from 'uuid'

import EnvService from '../services/env'
import UserService from './user'

const transcribeTable = `tanisi-${EnvService.getEnvironmentName()}`
let client

/**
 * @typedef {Object} Region
 * @property {Number} end End time of the region.
 * @property {Number} start Start time of the region.
 * @property {string} id ID of the region.
 * @property {Array<Object>} text List of text items in this region
 */

// TODO: there is a model in components/transcribe/Transcribe that would replace this
/**
 * @typedef {Object} Transcription
 * @property {string} author The owner of the transcription
 * @property {string} id The uuid of the transcription
 * @property {Object} content
 * @property {Number} coverage Total cumulative region coverage for the audio.
 * @property {Date} dateLastUpdated The last updated date.
 * @property {Number} length  Length of the audio in seconds.
 * @property {Array<Region>} regions
 * @property {string} source URL of the source audio file
 * @property {string} title Title of the transcription
 * @property {string} type Type of transcription (mp3|video)
 */

/**
 * Helper function to unwrap transcription data from dynamo.
 * @todo this should be a class
 * @returns {Array<Transcription>} List of regions
 */
function unwrapTranscription (item) {
  const [author, id] = item.author_ID.split(':')
  return {
    ...item.content,
    author,
    id,
    authorId: item.author_ID
  }
}

export default {
  /**
   * Helper, sets the AWS client for database calls.
   */
  async setClient () {
    AWS.config.update({ region: EnvService.getRegion() })
    AWS.config.credentials = await UserService.getCredentials()
    window.creds = AWS.config.credentials
    client = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })
  },

  /**
   * Get a list of transcriptions.
   * @param {string} user Currently unused.
   * @returns {Promise<Array<Transcription>>}
   */
  async listTranscriptions (user) {
    await this.setClient()
    const params = {
      TableName: transcribeTable,
      KeyConditionExpression: 'theKey = :k',
      ExpressionAttributeValues: {
        ':k': 'transcription'
      }
    }
    let list = await new Promise(function (resolve, reject) {
      client.query(params, function (error, data) {
        if (error) {
          reject(error)
        } else {
          resolve(data.Items)
        }
      })
    })
    list = list.map(item => unwrapTranscription(item))
    return list
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
  async createTranscription (data) {
    const { file, title } = data
    const timestamp = `${+new Date()}`
    const fileResult = await Storage.put(`${timestamp}-${file.name}`, file, {
      ACL: 'public-read',
      expires: new Date('Wed, 31 Dec 2098 23:59:59 GMT'),
      cacheControl: 'max-age=3600000'
    })
    const key = fileResult.key
    const bucket = EnvService.getUserBucket()
    const source = `https://${bucket}.s3.amazonaws.com/public/${key}`
    const result = await this.createTranscriptionDocument({
      title,
      source,
      type: file.type
    })
    return result
  },

  /**
   * @typedef NewTranscriptionRef
   * @property {string} id The id of the new transcription
   */

  /**
   * Create a new transcription record in the datastore.
   * @param {Object} data
   * @param {string} data.title The title of the document
   * @param {string} data.source The URL of the related file
   * @param {string} data.type The type of related file (mp3, etc)
   * @returns {NewTranscriptionRef}
   */
  async createTranscriptionDocument (data) {
    await this.setClient()
    const { title, source, type } = data
    const user = await UserService.getUser()
    const uuid = UUID.v1()
    const params = {
      TableName: transcribeTable,
      Item: {
        theKey: 'transcription',
        author_ID: `${user.name}:${uuid}`,
        content: {
          source,
          title,
          type,
          regions: []
        }
      }
    }
    await new Promise(function (resolve, reject) {
      client.put(params, function (error, data) {
        if (error) {
          reject(error)
        } else {
          resolve(data)
        }
      })
    })
    return { id: `${user.name}:${uuid}` }
  },

  /**
   * Get a transcription by id.
   * @param {string} id
   * @returns {Transcription}
   */
  async getTranscription (id) {
    await this.setClient()
    const params = {
      TableName: transcribeTable,
      KeyConditionExpression: 'theKey = :k and author_ID = :i',
      ExpressionAttributeValues: {
        ':k': 'transcription',
        ':i': id
      }
    }
    const item = await new Promise(function (resolve, reject) {
      client.query(params, function (error, data) {
        if (error) {
          reject(error)
        } else {
          resolve(data.Items)
        }
      })
    })

    return unwrapTranscription(item[0])
  },

  /**
   * Save a transcription.
   * @param {string} id
   * @param {Object} content
   * @todo fill out the content param
   */
  async saveTranscription (id, content) {
    const params = {
      TableName: transcribeTable,
      Key: {
        theKey: 'transcription',
        author_ID: id
      },
      UpdateExpression: 'set content = :c',
      ExpressionAttributeValues: {
        ':c': content
      }
    }
    const updated = await new Promise(function (resolve, reject) {
      client.update(params, function (err, data) {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
    return updated
  }
}
