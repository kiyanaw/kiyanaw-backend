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
  regionMap: {},
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
  regionMap(context) {
    return context.regionMap
  },
  regions(context) {
    console.log('!!!! regions have updated')
    // const copy = JSON.parse(JSON.stringify(context.regionMap))
    // return Object.values(copy)
    return Object.values(context.regionMap)
  },
  locks(context) {
    return context.locks
  },
  lockedRegionNames(context) {
    const keys = Object.keys(context.locks)
    logger.log('Getting Lock keys', keys, context.locks)
    return keys
  },
  regionById(context) {
    return (regionId) => {
      console.log('byId', regionId, context.regionMap)
      if (context.regionMap) {
        return Object.values(context.regionMap)
          .filter((region) => region.id === regionId)
          .pop()
      } else {
        return null
      }
    }
  },
}

const actions = {
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
    const map = {}
    let displayIndex = 1
    regions
      .slice()
      .sort((a, b) => (a.start > b.start ? 1 : -1))
      .map((item, index) => {
        const out = {
          ...item,
          index,
          displayIndex,
        }
        if (!item.isNote) {
          displayIndex++
        }
        return out
      })
      .forEach((item) => {
        map[`${item.index}-${item.id}`] = item
      })

    store.commit('SET_REGION_MAP', map)

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
    const region = store.getters.regionById(regionId)

    logger.info('setting selected region', region)

    store.commit('SET_SELECTED_REGION', region)
  },

  /**
   * TODO: this `input` differs from updateRegion
   */
  updateRegionById(store, input) {
    const update = input.update
    logger.info('Updating region by Id', update.start)
    const region = store.getters.regionById(input.id)
    store.commit('UPDATE_REGION', { region, update })

    // now that the update has fired, grab the region again
    const updated = store.getters.regionById(input.id)
    store.dispatch('saveRegion', updated)
  },

  /**
   * Trigger region updates for the selected region.
   * TODO: this is ambiguous and confused with non-specific region updates - fix it.
   * TODO: this update takes update object {id, start, end} differs from updateRegionById
   */
  updateRegion(store, update) {
    logger.debug('region updated', update)

    const region = store.getters.selectedRegion
    store.commit('UPDATE_REGION', { region, update })

    // now that the update has fired, grab the region again
    const updated = store.getters.regionById(region.id)
    console.log('updated', updated)
    store.dispatch('saveRegion', updated)
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

  SET_REGION_MAP(context, map) {
    Vue.set(context, 'regionMap', map)
  },

  SET_SELECTED_ISSUE(context, issue) {
    Vue.set(context, 'selectedIssue', issue)
  },

  SET_SELECTED_REGION(context, region) {
    Vue.set(context, 'selectedRegion', region)
  },

  UPDATE_REGION(context, update) {
    console.log('update', update)
    const region = update.region
    const id = `${region.index}-${region.id}`
    const existing = context.regionMap[id]
    const whole = Object.assign(existing, update.update)
    Vue.set(context.regionMap, id, whole)
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
