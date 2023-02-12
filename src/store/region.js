import { DataStore, Hub } from 'aws-amplify'
import { Region, Transcription } from '../models'
import * as assert from 'assert'

import Vue from 'vue'
import Timeout from 'smart-timeout'

import Lexicon from '../services/lexicon'
import UserService from '../services/user'
// import TranscriptionService from '../services/transcriptions'
import logging from '../logging'
// import EventBus from './bus'
import models from './models'

const logger = new logging.Logger('Region Store')

/**
 * An internal "save state" that keeps track of the queued
 * changes that need to go into DataStore, or if DataStore
 * is busy.
 */
const saveState = {
  /** keeps track of the state of the DS outbox */
  DS_OUTBOX_BUSY: false,
  /** keeps any changes that are 'queued' for save, reset when new region is selected & updated */
  REGION_INTERMEDIARY: { id: null },
  /** how long to pause between DS save attempts (if the outbox is busy) */
  SAVE_RETRY: 25
}

/**
 * If we try to DataStore.save() something while the outbox
 * has something in the queue, the update will silently fail.
 */
Hub.listen('datastore', async (hubData) => {
  const { event, data } = hubData.payload
  if (event === 'outboxStatus' && data.isEmpty === false) {
    // console.log('outbox busy')
    saveState.DS_OUTBOX_BUSY = true
  }
  else if (event === 'outboxStatus' && data.isEmpty) {
    // console.log('outbox free')
    saveState.DS_OUTBOX_BUSY = false
  }
})

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
    return Object.values(context.regionMap).sort((a, b) => (a.start > b.start ? 1 : -1))
  },
  locks(context) {
    return context.locks
  },
  lockedRegionNames(context) {
    const keys = Object.keys(context.locks)
    logger.debug('Getting Lock keys', keys, context.locks)
    return keys
  },

  regionById(context) {
    return (regionId) => {
      window.context = context
      if (context.regionMap) {
        return context.regionMap[regionId]
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

  async createIssue(store, issue) {
    console.log('Creating new issue', issue)
    const issues = store.getters.selectedRegion.issues
    issues.push(issue)
    store.dispatch('updateRegion', { issues })
  },

  async createRegion(store, region) {
    // TODO: some assertions around region
    store.dispatch('commitRegionAdd', region)
    store.dispatch('resetRegionIndices')

    // sync
    const transcription = await DataStore.query(Transcription, store.getters.transcription.id)
    const input = {
      id: region.id,
      start: region.start,
      end: region.end,
      text: JSON.stringify(region.text),
      dateLastUpdated: `${+new Date()}`,
      userLastUpdated: (await UserService.getUser()).name,
      transcription,
    }

    await DataStore.save(new Region(input))

    // TODO:
    // - update transcription dateLastUpdated
  },

  /**
   * Regions for the current transcription.
   * TODO: test this
   */
  setRegions(store, regions) {
    const map = {}
    let displayIndex = 1
    regions = regions
      // .slice()
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
        const region = new models.RegionModel(out)
        map[`${region.id}`] = region
        return region
      })

    store.commit('SET_REGION_MAP', map)
    console.log('!! Set region map')

    // asynchronously, report known words to the lexicon
    regions.forEach((region) => {
      const known = region.text
        .filter((item) => item.attributes && item.attributes['known-word'] !== undefined)
        .map((item) => item.insert)
      Lexicon.addKnownWords(known)
    })

    window.regions = regions
    window.map = map
  },

  resetRegionIndices(store) {
    let regions = Object.values(store.getters.regionMap)
    let displayIndex = 1
    regions
      .sort((a, b) => (a.start > b.start ? 1 : -1))
      .forEach((item, index) => {
        store.commit('UPDATE_REGION', {
          region: item, update: {
            index,
            displayIndex
          }})
        if (!item.isNote) {
          displayIndex++
        }
        
      })

  },

  /**
   * Accepts regionId and sets the selectedRegion (using the current transcription).
   */
  setSelectedRegion(store, regionId) {
    const region = store.getters.regionById(regionId)
    logger.info('setting selected region', regionId)
    store.commit('SET_SELECTED_REGION', region)
  },

  /**
   * Wrapper for `updateRegionById`.
   */
  async updateRegion(store, update) {
    console.log('updateRegion called', update)
    const region = store.getters.selectedRegion
    store.dispatch('updateRegionById', {
      ...update, 
      id: region.id
    })
  },

  async updateRegionById(store, update) {
    assert.ok(update.id, 'update.id must be provided')
    console.log('updateRegionById', update)
    const regionId = update.id
    // logger.debug('Updating region by Id', regionId)
    const region = store.getters.regionById(regionId)
    // commit to local store
    store.dispatch('commitRegionUpdate', { region, update })

    // buffer region updates
    if (saveState.REGION_INTERMEDIARY.id !== update.id) {
      saveState.REGION_INTERMEDIARY = update
    } else {
      Object.assign(saveState.REGION_INTERMEDIARY, update)
    }
    // enqueue changes
    store.dispatch('enqueueRegionUpdate', regionId)
  },

  /**
   * Timer function that retries saving to DataStore based
   * on the outbox status.
   */
  enqueueRegionUpdate(store, regionId) {
    assert.ok(regionId, 'regionId must be provided')
    if (saveState.DS_OUTBOX_BUSY) {
      Timeout.set('ds-outbox-time', () => {
        store.dispatch('enqueueRegionUpdate', regionId)
      }, saveState.SAVE_RETRY)
      return
    } else {
      store.dispatch('commitToDataStore', regionId)
    }
  },

  /**
   * Actually commit the region to DataStore.
   */
  async commitToDataStore(store, regionId) {
    assert.ok(regionId, 'regionId must be provided')

    const user = await UserService.getUser()
    const queuedUpdate = saveState.REGION_INTERMEDIARY
    const keysToEncode = ['text', 'issues', 'comments']
    keysToEncode.forEach((key) => {
      if (queuedUpdate[key] && typeof queuedUpdate[key] !== 'string') {
        queuedUpdate[key] = JSON.stringify(queuedUpdate[key])
      }
    })

    const valuesToUpdate = {
      ...queuedUpdate,
      userLastUpdated: user.name,
      dateLastUpdated: `${Date.now()}`,
    }
    const dbOriginal = await DataStore.query(Region, regionId)
    const copy = Region.copyOf(dbOriginal, (toUpdate) => {
      for (const key of Object.keys(valuesToUpdate)) {
        toUpdate[key] = valuesToUpdate[key]
      }
    })
    await DataStore.save(copy)
  },

  /**
   * This is a centralized place to process UI updates based on whether
   * certain characteristics of a region has changed.
   */
  async commitRegionUpdate(store, update) {
    const incoming = update.update
    const existing = update.region
    let resetIndexes = false

    // TODO: test this
    // check to see if the incoming update has different start/end times
    if (incoming.start !== existing.start || incoming.end !== existing.end) {
      // TODO: this can be further optimized to only update
      // when the start time goes below/above neighbor regions
      resetIndexes = true
    }
    store.commit('UPDATE_REGION', update)
    
    if (resetIndexes) {
      store.dispatch('resetRegionIndices')
      
    }
  },

  // TODO: test this
  async commitRegionAdd(store, region) {
    let resetIndexes = false
    // only reset indexes if not at the end of the file
    const lastRegion = store.getters.regions[store.getters.regions.length - 1]
    if (lastRegion) {
      if (region.start < lastRegion.start) {
        resetIndexes = true
      } else {
        // region is at the end of the list
        region.index = lastRegion.index + 1
        region.displayIndex = lastRegion.displayIndex + 1
      }
    } else {
      resetIndexes = true
    }
    store.commit('ADD_REGION', region)

    if (resetIndexes) {
      store.dispatch('resetRegionIndices')
    }
  }, 

  async deleteRegion(store, regionId) {
    store.commit('DELETE_REGION', regionId)
    await DataStore.delete(Region, regionId)
    store.dispatch('resetRegionIndices')
  }
}

const mutations = {

  DELETE_REGION(context, regionId) {
    Vue.delete(context.regionMap, regionId)
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

  ADD_REGION(context, region) {
    const id = region.id
    const instance = new models.RegionModel(region)
    Vue.set(context.regionMap, id, instance)
  },

  UPDATE_REGION(context, update) {
    const region = update.region
    const id = `${region.id}`
    const existing = context.regionMap[id]
    const whole = new models.RegionModel(Object.assign(existing, update.update))
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
  // for testing
  saveState,
}
