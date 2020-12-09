import Vue from 'vue'
// import Timeout from 'smart-timeout'

import Lexicon from '../services/lexicon'
import UserService from '../services/user'
import logging from '../logging'

const logger = new logging.Logger('Region Store')

/**
 * Special queue outside the normal store just used to track unlocking.
 */
const unlockQueue = []

const state = {
  regions: [],
  // The currently-selected region
  selectedRegion: null,
  selectedIssue: null,
  locks: {},
}

const getters = {
  selectedIssue(context) {
    return context.selectedIssue
  },
  selectedRegion(context) {
    return context.selectedRegion
  },
  regions(context) {
    // TODO: wrap regions in a class
    if (context.regions) {
      // use .slice() to copy the array and prevent modifying the original
      const sorted = context.regions.slice().sort((a, b) => (a.start > b.start ? 1 : -1))
      let realIndex = 1
      // add an index for visual aide
      for (const index in sorted) {
        if (!sorted[index].isNote) {
          sorted[index].index = realIndex
          realIndex = realIndex + 1
        }
      }
      return sorted
    } else {
      return []
    }
  },
  locks(context) {
    return context.locks
  },
  lockedRegionNames(context) {
    const keys = Object.keys(context.locks)
    logger.log('Getting Lock keys', keys, context.locks)
    return keys
  },
}

const actions = {
  updateRegionById(store, update) {
    logger.info('Updating region by Id', update)
    store.commit('UPDATE_REGION', update)

    const region = store.getters.selectedRegion
    store.dispatch('saveRegion', region)
  },

  /**
   * Trigger region updates for the selected region.
   * TODO: this is ambiguous and confused with non-specific region updates - fix it.
   */
  updateRegion(store, update) {
    logger.debug('region updated', store, update)
    const regionId = store.getters.selectedRegion.id
    store.commit('UPDATE_REGION', { id: regionId, update })

    const region = store.getters.selectedRegion
    store.dispatch('saveRegion', region)
  },

  updateSelectedIssue(store, update) {
    logger.debug('selectedIssue updated', update)
    store.commit('UPDATE_SELECTED_ISSUE', update)
  },

  setSelectedIssue(store, issue) {
    logger.debug('setSelectedIssue', issue)
    store.commit('SET_SELECTED_ISSUE', issue)
  },

  getLockedRegions(store) {
    logger.debug('Getting all locks')

    const transcriptionId = store.getters.transcription.id
    UserService.getRegionLocks(transcriptionId)
      .then((locks) => {
        for (const lock of locks) {
          logger.info('Incoming lock for region', lock.id, lock)
          store.commit('SET_LOCK', { key: lock.id, data: lock })

          // check for our locks, push to unlock queue if any
          if (lock.user === store.getters.user.name) {
            store.dispatch('pushToUnlockQueue', lock)
          }
        }
      })
      .catch((error) => {
        console.warn('Unable to get region locks', error)
      })

    UserService.listenForLock((update) => {
      console.log('got realtime lock 1', update)
      store.dispatch('realtimeLockUpdate', update)
    })
  },

  realtimeLockUpdate(store, update) {
    logger.info('Got realtime lock update', update.action, update)
    if (update.action === 'created') {
      store.commit('SET_LOCK', { key: update.id, data: update })
    } else {
      store.commit('SET_LOCK', { key: update.id, data: null })
    }
  },

  lockRegion(store, callback) {
    logger.info('Region lock requested')
    // store.commit('SET_LOCK', regionId, true)
    const regionId = store.getters.selectedRegion.id
    const transcriptionId = store.getters.transcription.id
    UserService.lockRegion(transcriptionId, regionId).then((result) => {
      if (result) {
        store.commit('SET_LOCK', { key: result.id, data: result })
        callback(result)

        // unlock any existing regions and then queue up this region for unlock
        store.dispatch('processUnlockQueue')

        result.transcriptionId = transcriptionId
        store.dispatch('pushToUnlockQueue', result)
      } else {
        callback(null)
      }
    })
  },

  processUnlockQueue() {
    logger.info(`Processing unlock queue, ${unlockQueue.length} items`)
    while (unlockQueue.length) {
      const unlock = unlockQueue.pop()
      unlock()
    }
  },

  unlockRegion(store) {
    store.dispatch('processUnlockQueue')
  },

  pushToUnlockQueue(store, item) {
    logger.info('Pushing item to unlock queue', item, store)
    unlockQueue.push(() => {
      logger.info(`Unlock for region ${item.id} triggered`)
      UserService.unlockRegion(item.transcriptionId, item.id).then((result) => {
        logger.info(`Region ${item.id} unlocked: ${result}`)
      })
    })
  },

  /**
   * Regions for the current transcription.
   */
  setRegions(store, regions) {
    store.commit('SET_REGIONS', regions)

    // asynchronously, report known words to the lexicon
    regions.forEach((region) => {
      const known = region.text
        .filter((item) => item.attributes && item.attributes['known-word'] !== undefined)
        .map((item) => item.insert)
      Lexicon.addKnownWords(known)
    })
  },

  /**
   * Accepts regionId and sets the selectedRegion (using the current transcription).
   */
  setSelectedRegion(store, regionId) {
    const region = store.getters.transcriptionRegionById(regionId)

    logger.info('setting selected region', region)

    store.commit('SET_SELECTED_REGION', region)
  },
}

const mutations = {
  SET_LOCK(context, update) {
    logger.info('Setting lock', update)
    if (update.data) {
      Vue.set(context.locks, update.key, update.data)
    } else {
      Vue.delete(context.locks, update.key)
    }
  },

  SET_REGIONS(context, regions) {
    Vue.set(context, 'regions', regions)
  },

  SET_SELECTED_ISSUE(context, issue) {
    Vue.set(context, 'selectedIssue', issue)
  },

  SET_SELECTED_REGION(context, region) {
    if (region) {
      console.log('SETTING selected region', region.id, region.text)
    }
    Vue.set(context, 'selectedRegion', region)
  },

  UPDATE_REGION(context, update) {
    console.log(update)
    const item = context.regions.find((item) => item.id === update.id)
    const index = context.regions.findIndex((item) => item.id === update.id)
    const whole = Object.assign(item, update.update)
    Vue.set(context.regions, index, whole)
  },

  UPDATE_SELECTED_ISSUE(context, update) {
    // first update is necessary for selectedIssue
    const issue = context.selectedIssue
    const whole = Object.assign({}, issue, update)
    Vue.set(context, 'selectedIssue', whole)

    // second update is necessary for issue list
    const allIssues = context.selectedRegion.issues
    Vue.set(
      context.selectedRegion,
      'issues',
      allIssues.map((item) => {
        if (item.id === issue.id) {
          return whole
        } else {
          return item
        }
      }),
    )
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
