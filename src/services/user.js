import { Auth } from 'aws-amplify'

import appsync from './appsync'
import { createCursor, updateCursor, createLock, deleteLock } from '../graphql/mutations'
import { onUpdateCursor, onCreateLock, onDeleteLock } from '../graphql/subscriptions'
import gql from 'graphql-tag'

let user
let cursorSubscription = null
let createLockSubscription = null
let deleteLockSubscription = null
const cursorSubscribers = []
const lockSubscribers = []

export default {
  async getUser () {
    if (!user) {
      window.auth = Auth
      user = await Auth.currentAuthenticatedUser({ bypassCache: false })
    }
    return {
      name: user.username
    }
  },
  async getCredentials () {
    return Auth.currentCredentials()
  },
  /**
   * Send updates about cursors in real time.
   */
  async sendCursor (details) {
    const appsyncClient = appsync.getClient()
    let result
    // TODO: this works, but it might be better to put the cursor updates on a timer
    // this is going to flood dynamo with a lot of requests
    try {
      result = await appsyncClient.mutate({
        mutation: gql(updateCursor),
        variables: {
          input: {
            id: details.user,
            user: details.user,
            cursor: JSON.stringify(details.cursor)
          }
        }
      })
    } catch (error) {
      // cursor object probably didn't exist
      result = await appsyncClient.mutate({
        mutation: gql(createCursor),
        variables: {
          input: {
            id: details.user,
            user: details.user,
            cursor: details.cursor
          }
        }
      })
      // TODO: get updates from cursor
    }
    return result
  },
  async listenForCursor (callback) {
    // let up a listener, if we don't have one already
    if (!cursorSubscription) {
      const client = appsync.getClient()
      cursorSubscription = client.subscribe({ query: gql(onUpdateCursor) }).subscribe({
        next: (data) => {
          const cursorData = data.data.onUpdateCursor
          // unpack the JSON data
          cursorData.cursor = JSON.parse(cursorData.cursor)
          for (const subscriber of cursorSubscribers) {
            subscriber(cursorData)
          }
        },
        error: (error) => {
          console.error('onUpdateCursor subscription error', error)
        }
      })
    }
    cursorSubscribers.push(callback)
  },

  async lockRegion (regionId) {
    const user = await this.getUser()
    try {
      const client = appsync.getClient()
      await client.mutate({
        mutation: gql(createLock),
        variables: {
          input: {
            id: regionId,
            user: user.name
          }
        }
      })
    } catch (error) {
      console.error(error)
      return false
    }
    return true
  },

  async unlockRegion (regionId) {
    try {
      const client = appsync.getClient()
      await client.mutate({
        mutation: gql(deleteLock),
        variables: {
          input: {
            id: regionId
          }
        }
      })
    } catch (error) {
      console.error(error)
      return false
    }
    return true
  },

  async listenForLock (callback) {
    if (!createLockSubscription) {
      const user = await this.getUser()
      const client = appsync.getClient()
      createLockSubscription = client.subscribe({ query: gql(onCreateLock) }).subscribe({
        next: (data) => {
          console.log('region lock created', data)
          data = data.data.onCreateLock
          data.action = 'created'
          for (const subscriber of lockSubscribers) {
            if (user.name !== data.user) {
              subscriber(data)
            }
          }
        },
        error: (error) => {
          console.error('onCreateLock subscription error', error)
        }
      })
    }
    if (!deleteLockSubscription) {
      const user = await this.getUser()
      const client = appsync.getClient()
      deleteLockSubscription = client.subscribe({ query: gql(onDeleteLock) }).subscribe({
        next: (data) => {
          console.log('region lock deleted', data)
          data = data.data.onDeleteLock
          data.action = 'deleted'
          for (const subscriber of lockSubscribers) {
            if (user.name !== data.user) {
              subscriber(data)
            }
          }
        },
        error: (error) => {
          console.error('onDeleteLock subscription error', error)
        }
      })
    }
    lockSubscribers.push(callback)
  }
}
