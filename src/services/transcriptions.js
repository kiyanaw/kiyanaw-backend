import AWS from 'aws-sdk'
import { Storage } from 'aws-amplify'
import UUID from 'uuid'

import EnvService from '../services/env'
import UserService from './user'

const transcribeTable = `tanisi-${EnvService.getEnvironmentName()}`



// const dynamo = new AWS.DynamoDB({apiVersion: '2012-08-10'});
// const docClient = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'})

let client

function unwrap (item) {
  // const content = JSON.parse(item.content)
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
   * 
   */
  async setClient () {
    AWS.config.update({region: EnvService.getRegion()})
    AWS.config.credentials = await UserService.getCredentials()
    client = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'})
  },
  /**
   * 
   * @param {*} user 
   * @returns {Promise<Array>}
   */
  async listTranscriptions (user) {
    await this.setClient()
    const params = {
      TableName: transcribeTable,
      KeyConditionExpression: 'theKey = :k',
      ExpressionAttributeValues: {
        ':k': 'transcription'
      }
      // KeyConditionExpression: 'theKey = :k and begins_with(author_ID, :u)',
      // ExpressionAttributeValues: {
      //   ':k': 'transcription',
      //   ':u': user
      // }
    }
    let list = await new Promise(function (resolve, reject) {
      client.query(params, function(error, data) {
        if (error) {
          reject(error)
        } else {
          resolve(data.Items)
        }
      });
    })
    list = list.map(item => unwrap(item))
    return list
  },
  /**
   * 
   * @param {*} data 
   */
  async createTranscription (data) {
    const {file, title} = data
    const timestamp = `${+ new Date}`
    const fileResult = await Storage.put(`${timestamp}-${file.name}`, file, {
      ACL: 'public-read',
      expires: new Date('Sat, 27 Jun 2099 23:59:59 GMT'),
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
   * 
   * @param {*} id 
   */
  async createTranscriptionDocument (data) {
    await this.setClient()
    const {title, source, type} = data
    const user = await UserService.getUser()
    console.log(user)
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

    const result = await new Promise(function (resolve, reject) {
      client.put(params, function (err, data) {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
    // if we got this far we're good
    // TODO: need some tests around this failure.
    return {id: `${user.name}:${uuid}`}
  },
  /**
   * 
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
      client.query(params, function(error, data) {
        if (error) {
          reject(error)
        } else {
          resolve(data.Items)
        }
      });
    })

    return unwrap(item[0])
  },
  /**
   * 
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
      client.update(params, function(err, data) {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
     });
    })
    return updated
  }
}