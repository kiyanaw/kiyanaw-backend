import { Auth } from 'aws-amplify'

import {
  createCursor,
  createEditor,
  // createTranscriptionEditor,
  updateCursor,
  // deleteTranscriptionEditor,
  createRegionLock,
  deleteRegionLock,
} from '../graphql/mutations'
// import {  onCreateRegionLock, onDeleteRegionLock } from '../graphql/subscriptions'
import { listRegionLocks } from '../graphql/queries'

import { API, graphqlOperation } from 'aws-amplify'
import logging from '../logging'

const logger = new logging.Logger('User Service')

// TODO: migrate dateLastUpdated to updatedAt
export const getEditorWithTranscriptions = /* GraphQL */ `
  query GetEditor($username: ID!) {
    getEditor(username: $username) {
      email
      username
      transcriptions {
        items {
          id
          transcriptionId
          username
          createdAt
          updatedAt
          transcription {
            id
            author
            title
            coverage
            dateLastUpdated
            userLastUpdated
            length
            issues
            comments
            tags
            source
            index
            title
            type
          }
        }
        nextToken
      }
      createdAt
      updatedAt
    }
  }
`

let user
// let cursorSubscription = null
// let createLockSubscription = null
// let deleteLockSubscription = null
// const cursorSubscribers = []
// const lockSubscribers = []
const myLocks = {}

export default {
  async getUser() {
    if (!user) {
      user = await Auth.currentAuthenticatedUser({ bypassCache: false })
    }

    return {
      name: user.username,
      email: user.attributes.email,
    }
  },

  /**
   * NOTE: as a result of the way profiles work, a user will have to log in at least once in order
   * to be available as an editor for other transcriptions.
   */
  async getProfile() {
    const user = await this.getUser()
    const response = await API.graphql(
      graphqlOperation(getEditorWithTranscriptions, { username: user.name }),
    )
    console.log('response', response)
    const existing = response.data.getEditor
    console.log('existing profile', existing)

    if (!existing) {
      // TODO: this should return a newly-created profile
      console.warn(`Profile does not exist for ${user.name}, creating...`)
      const created = await API.graphql(
        graphqlOperation(createEditor, { input: { username: user.name, email: user.email } }),
      )
      console.log('Profile created for user', created)
    }
    return existing
  },

  async flush() {
    Auth.signOut()
  },

  async getCredentials() {
    return Auth.currentCredentials()
  },
  /**
   * Send updates about cursors in real time.
   */
  async sendCursor(details) {
    let result
    // TODO: this works, but it might be better to put the cursor updates on a timer
    // this is going to flood dynamo with a lot of requests
    try {
      result = await API.graphql(
        graphqlOperation(updateCursor, {
          input: {
            id: details.user,
            user: details.user,
            cursor: JSON.stringify(details.cursor),
          },
        }),
      )
    } catch (error) {
      // cursor object probably didn't exist
      result = await API.graphql(
        graphqlOperation(createCursor, {
          input: {
            id: details.user,
            user: details.user,
            cursor: JSON.stringify(details.cursor),
          },
        }),
      )
    }
    // console.log('cursor', result)
    return result
  },

  async listenForCursor() {
  },

  async lockRegion(transcriptionId, regionId) {
    const user = await this.getUser()
    const input = {
      id: regionId,
      user: user.name,
      deleteTime: Number((+new Date() / 1000).toFixed(0)) + 300, // 5 minutes from now
      transcriptionId,
    }
    try {
      logger.debug('lockRegion input', input)
      await API.graphql(graphqlOperation(createRegionLock, { input: input }))
    } catch (error) {
      logger.error(error)
      return null
    }
    return input
  },

  async clearOtherUserLocks(transcriptionId, keepLock) {
    const user = await this.getUser()
    const locks = await this.getRegionLocks(transcriptionId)
    for (const lock of locks) {
      if (lock.user === user.name && lock.id !== keepLock) {
        this.unlockRegion(transcriptionId, lock.id)
      }
    }
  },

  async unlockRegion(transcriptionId, regionId) {
    delete myLocks[regionId]
    try {
      await API.graphql(
        graphqlOperation(deleteRegionLock, { input: { id: regionId, transcriptionId } }),
      )
    } catch (error) {
      console.error(error)
      return false
    }
    return true
  },

  async listenForLock() {
  },

  async getRegionLocks(transcriptionId) {
    const user = await this.getUser()
    const response = await API.graphql(
      graphqlOperation(listRegionLocks, { input: { transcriptionId: transcriptionId } }),
    )
    // console.log('all region locks', response.data)
    if (response.data) {
      const locks = response.data.listRegionLocks.items
      for (const lock of locks) {
        if (lock.user === user.name) {
          myLocks[lock.id] = true
        }
      }
      // TODO: check for nextToken
      return locks
    }
    return []
  },
}
