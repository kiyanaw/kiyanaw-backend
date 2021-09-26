import { Auth } from 'aws-amplify'

import {
  createCursor,
  updateCursor,
  createRegionLock,
  deleteRegionLock,
} from '../graphql/mutations'
import { onUpdateCursor, onCreateRegionLock, onDeleteRegionLock } from '../graphql/subscriptions'
import { listRegionLocks } from '../graphql/queries'

import { API, graphqlOperation } from 'aws-amplify'
import logging from '../logging'

const logger = new logging.Logger('User Service')

let user
let cursorSubscription = null
let createLockSubscription = null
let deleteLockSubscription = null
const cursorSubscribers = []
const lockSubscribers = []
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
          authMode: 'AWS_IAM',
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
          authMode: 'AWS_IAM',
        }),
      )
    }
    // console.log('cursor', result)
    return result
  },

  async listenForCursor(callback) {
    // let up a listener, if we don't have one already
    if (!cursorSubscription) {
      cursorSubscription = API.graphql(graphqlOperation(onUpdateCursor), {
        authMode: 'AWS_IAM',
      }).subscribe({
        next: (data) => {
          // console.log('cursor data', data.value.data.onUpdateCursor)
          const cursorData = data.value.data.onUpdateCursor
          // unpack the JSON data
          if (typeof cursorData.cursor === 'string') {
            cursorData.cursor = JSON.parse(cursorData.cursor)
          }
          for (const subscriber of cursorSubscribers) {
            subscriber(cursorData)
          }
        },
        error: (error) => {
          console.warn('onUpdateCursor subscription error', error)
        },
      })
    }
    cursorSubscribers.push(callback)
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

  async listenForLock(callback) {
    if (!createLockSubscription) {
      createLockSubscription = API.graphql(graphqlOperation(onCreateRegionLock)).subscribe({
        next: (lockData) => {
          const data = lockData.value.data.onCreateRegionLock
          data.action = 'created'
          for (const subscriber of lockSubscribers) {
            subscriber(data)
          }
        },
        error: (error) => {
          console.warn('Could not subscribe to locks', error)
        },
      })
    }
    if (!deleteLockSubscription) {
      deleteLockSubscription = API.graphql(graphqlOperation(onDeleteRegionLock)).subscribe({
        next: (lockData) => {
          const data = lockData.value.data.onDeleteRegionLock
          data.action = 'deleted'
          for (const subscriber of lockSubscribers) {
            subscriber(data)
          }
        },
        error: (error) => {
          console.warn('Could not subscribe to locks', error)
        },
      })
    }
    lockSubscribers.push(callback)
  },

  async getRegionLocks(transcriptionId) {
    const user = await this.getUser()
    const response = await API.graphql(
      graphqlOperation(
        listRegionLocks,
        { input: { transcriptionId: transcriptionId } },
        { authMode: 'AWS_IAM' },
      ),
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
