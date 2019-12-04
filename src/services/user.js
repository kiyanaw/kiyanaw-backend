import { Auth } from 'aws-amplify'

// import appsync from './appsync'
import { createCursor, updateCursor, createRegionLock, deleteRegionLock } from '../graphql/mutations'
import { onUpdateCursor, onCreateRegionLock, onDeleteRegionLock } from '../graphql/subscriptions'
import { listRegionLocks } from '../graphql/queries'
import gql from 'graphql-tag'
import { ConsoleLogger } from '@aws-amplify/core'

import { API, graphqlOperation, Storage } from 'aws-amplify'

let user
let cursorSubscription = null
let createLockSubscription = null
let deleteLockSubscription = null
const cursorSubscribers = []
const lockSubscribers = []
const myLocks = {}
// Keep track of the last update we've received.
const timestamps = {
  lock: 0
}

export default {
  async getUser () {
    if (!user) {
      user = await Auth.currentAuthenticatedUser({ bypassCache: false })
    }
    // username is some garbage like 2b3cfffd-8c78-430f-a2b4-ef71c6017016
    // pull name from first part of email
    const name = user.attributes.email.split('@')[0]
    return {
      name: name,
      email: user.attributes.email
    }
  },
  async getCredentials () {
    return Auth.currentCredentials()
  },
  /**
   * Send updates about cursors in real time.
   */
  async sendCursor (details) {
    // const appsyncClient = appsync.getClient()
    console.log(details)
    let result
    // TODO: this works, but it might be better to put the cursor updates on a timer
    // this is going to flood dynamo with a lot of requests
    try {
      result = await API.graphql(graphqlOperation(updateCursor, {
        input: {
          id: details.user,
          user: details.user,
          cursor: JSON.stringify(details.cursor)
        }
      }))
    } catch (error) {
      // cursor object probably didn't exist
      result = await API.graphql(graphqlOperation(createCursor, {
        input: {
          id: details.user,
          user: details.user,
          cursor: JSON.stringify(details.cursor)
        }
      }))
    }
    // console.log('cursor', result)
    return result
  },

  async listenForCursor (callback) {
    // let up a listener, if we don't have one already
    if (!cursorSubscription) {
      cursorSubscription = API.graphql(graphqlOperation(onUpdateCursor)).subscribe({
        next: (data) => {
          // console.log('cursor data', data.value.data.onUpdateCursor)
          const cursorData = data.value.data.onUpdateCursor
          // unpack the JSON data
          // console.log(cursorData.cursor)
          if (typeof cursorData === 'string') {
            cursorData.cursor = JSON.parse(cursorData.cursor)
          }
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

  async lockRegion (transcriptionId, regionId) {
    // if we don't have a lock already, attempt one
    if (!myLocks[regionId]) {
      const user = await this.getUser()
      if (Object.keys(myLocks).includes(regionId)) {
        return true
      } else {
        try {
          const input = {
            id: regionId,
            user: user.name,
            timestamp: Number((+new Date() / 1000).toFixed(0)),
            transcriptionId
          }
          await API.graphql(graphqlOperation(createRegionLock, { input: input }))
        } catch (error) {
          console.error(error)
          delete myLocks[regionId]
          return false
        }
        myLocks[regionId] = true
        return true
      }
    } else {
      return true
    }
  },

  async unlockRegion (transcriptionId, regionId) {
    const user = await this.getUser()
    console.log(`unlock called by ${user.name} - ${regionId}`)
    delete myLocks[regionId]
    try {
      await API.graphql(graphqlOperation(deleteRegionLock, { input: { id: regionId, transcriptionId } }))
    } catch (error) {
      console.error(error)
      return false
    }
    return true
  },

  async listenForLock (callback) {
    const user = await this.getUser()
    if (!createLockSubscription) {
      createLockSubscription = API.graphql(graphqlOperation(onCreateRegionLock)).subscribe({
        next: (lockData) => {
          const data = lockData.value.data.onCreateRegionLock
          console.log('incoming lock', data.user)
          if (data && data.user !== user.name) {
            console.log(`data.user ${data.user} !== ${user.name}`)
            data.action = 'created'
            // console.log('Region locked by another user: ', data)
            for (const subscriber of lockSubscribers) {
              if (user.name !== data.user) {
                subscriber(data)
              }
            }
          }
        }
      })
    }
    if (!deleteLockSubscription) {
      deleteLockSubscription = API.graphql(graphqlOperation(onDeleteRegionLock)).subscribe({
        next: (lockData) => {
          console.log('incoming UNlock', lockData)
          const data = lockData.value.data.onDeleteRegionLock
          // TODO: check TTL on this
          if (data.user !== user.name) {
            data.action = 'deleted'
            // console.log('Region UNlocked by another user: ', data)
            for (const subscriber of lockSubscribers) {
              if (user.name !== data.user) {
                subscriber(data)
              }
            }
          }
        }
      })
    }
    lockSubscribers.push(callback)
  },

  async getRegionLocks (transcriptionId) {
    const user = await this.getUser()
    const response = await API.graphql(graphqlOperation(listRegionLocks, { input: { transcriptionId: transcriptionId } }))
    // console.log('all region locks', response.data)
    if (response.data) {
      const locks = response.data.listRegionLocks.items
      for (const lock of locks) {
        if (lock.user === user.name) {
          myLocks[lock.id] = true
        }
      }
      console.log('my locks', myLocks)
      // TODO: check for nextToken
      return locks.filter(item => item.user !== user.name)
    }
    return []
  }
}
