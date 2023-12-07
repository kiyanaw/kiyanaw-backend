import * as assert from 'assert'
import { DataStore, Hub } from 'aws-amplify'
import { Issue, Pointer, Region, Transcription } from '../models'
// import Quill from 'quill'

import Timeout from 'smart-timeout'
import Vue from 'vue'

import Lexicon from '../services/lexicon'
import UserService from '../services/user'
// import TranscriptionService from '../services/transcriptions'
import logging from '../logging'
// import EventBus from './bus'
import EventBus from './bus'
import models from './models'
// import * as helpers from '../helpers'
// import EventBus from './bus'

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
  issueMap: {}, // look up issues by region
  // The currently-selected region
  selectedRegionId: null,
  selectedRegion: null,
  selectedIssue: null,
  locks: {},
}

const getters = {
  selectedIssue(context) {
    return context.selectedIssue
  },
  selectedRegion(context) {
    return context.regionMap[context.selectedRegionId]
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
  issueMap(context) {
    return context.issueMap
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
  // TODO: needs tests
  async updateUserCursor(store, update) {
    Timeout.clear('save-user-cursor-timer')
    Timeout.set(
      'save-user-cursor-timer',
      async () => {
        const region = store.getters.selectedRegion
        const transcriptionId = store.getters.transcription.id
        const user = await UserService.getUser()
        let cursor = await DataStore.query(Pointer, user.name)
        if (!cursor) {
          cursor = await DataStore.save(
            new Pointer({
              id: user.name,
              transcription: transcriptionId,
              region: '',
              cursor: '',
            }),
          )
        } else {
          cursor = Pointer.copyOf(cursor, (newInstance) => {
            newInstance.region = region.id
            newInstance.cursor = JSON.stringify(update)
          })
          await DataStore.save(cursor)
        }
      },
      250,
    )
  },

  updateSelectedIssue(store, update) {
    logger.debug('selectedIssue updated', update)
    store.commit('UPDATE_SELECTED_ISSUE', update)
  },

  setSelectedIssue(store, issue) {
    logger.debug('setSelectedIssue', issue)
    store.commit('SET_SELECTED_ISSUE', issue)
  },

  async createRegion(store, region) {
    // TODO: some assertions around region
    store.dispatch('commitRegionAdd', region)
    store.dispatch('resetRegionIndices')

    const dateLastUpdated = `${+new Date()}`
    const userLastUpdated = (await UserService.getUser()).name

    // sync
    const transcription = await DataStore.query(Transcription, store.getters.transcription.id)
    const input = {
      id: region.id,
      start: region.start,
      end: region.end,
      text: JSON.stringify(region.text),
      dateLastUpdated,
      userLastUpdated,
      transcription,
    }

    await DataStore.save(new Region(input))

    // also update the transcription
    store.dispatch('updateTranscription', {
      userLastUpdated,
    })
  },

  /**
   * Builds and sets the global issue map for the transcription. Issues
   * are mapped by region for easy lookup on store.getters.issueMap
   */
  setIssues(store, issues) {
    const issueMap = {}
    if (issues && issues.length) {
      // Sort out the issues by region
      issues.forEach((issue) => {
        if (!issueMap[issue.regionId]) {
          issueMap[issue.regionId] = []
        }
        // TODO: this needs to be a model
        // remove "managed" fields like `createdAt`
        const { id, text, owner, index, type, resolved, comments, regionId, transcriptionId } = issue
        issue = {
          id,
          text,
          owner,
          index,
          resolved,
          type,
          comments,
          regionId,
          transcriptionId,
        }
        issueMap[issue.regionId].push(issue)
      })
    }

    store.commit('SET_ISSUE_MAP', issueMap)
  },

  /**
   * Update is { regionId, newIssue }
   */
  addRegionIssue(store, update) {
    // save the new issue
    DataStore.save(new Issue(update.newIssue))

    // update the issue map with the new issue
    const { regionId, newIssue } = update
    const issues = store.getters.issueMap[regionId]
    issues.push(newIssue)

    // issues are saved separately, but trigger an update for
    // last updated user and the date
    store.dispatch('updateRegion', {})
  },

  /**
   * Update is { regionId, issueId }
   */
  deleteRegionIssue(store, update) {
    const { regionId, issueId } = update

    // delete from DataStore
    DataStore.delete(Issue, issueId)

    // update issue map
    let index
    store.getters.issueMap[regionId].forEach((item, i) => {
      if (item.id === issueId) {
        index = i
      }
    })
    store.getters.issueMap[regionId].splice(index, 1)

    // notify components
    EventBus.$emit('issues-updated')

    // issues are saved separately, but trigger an update for
    // last updated user and the date
    store.dispatch('updateRegion', {})
  },

  // Update is { regionId, issueId, issueUpdate }
  async updateRegionIssue(store, update) {
    const { regionId, issueId, issueUpdate } = update

    // update issue map
    let index
    store.getters.issueMap[regionId].forEach((item, i) => {
      if (item.id === issueId) {
        index = i
      }
    })

    if (index !== undefined) {
      console.log('updating index', index)
      // apply on the store
      const storeUpdate = {
        ...store.getters.issueMap[regionId][index],
        ...issueUpdate,
      }
      store.getters.issueMap[regionId].splice(index, 1)

      store.getters.issueMap[regionId].push(storeUpdate)
      // apply to selected issue
  
      console.log('issues updated', store.getters.issueMap[regionId])
  
      // notify components
      EventBus.$emit('issues-updated')
      // update transcription
      store.dispatch('updateRegion', {})
  
      // Lastly update DataStore
      const dbOriginal = await DataStore.query(Issue, issueId)
  
      const copy = Issue.copyOf(dbOriginal, (toUpdate) => {
        for (const key of Object.keys(issueUpdate)) {
          toUpdate[key] = issueUpdate[key]
        }
      })
      await DataStore.save(copy)
    } else {
      logger.warn('Could not update issue, no index?')
    }
  },

  /**
   * Regions for the current transcription.
   * TODO: test this
   */
  setRegions(store, regions) {
    const map = {}
    const issueMap = store.getters.issueMap

    let displayIndex = 1
    regions = regions
      .sort((a, b) => (a.start > b.start ? 1 : -1))
      .map((item, index) => {
        const issues = issueMap[item.id]
        const out = {
          ...item,
          issues,
          index,
          displayIndex,
        }
        if (!item.isNote) {
          displayIndex++
        }
        const region = new models.RegionModel(out)
        map[`${region.id}`] = region

        // add to the lexicon
        Lexicon.addKnownWords(region.regionAnalysis)

        return region
      })

    store.commit('SET_REGION_MAP', map)

    window.regions = regions
    window.map = map
  },

  resetRegionIndices(store) {
    logger.debug('RESET REGION INDICES')
    let regions = Object.values(store.getters.regionMap)
    let displayIndex = 1
    regions
      .sort((a, b) => (a.start > b.start ? 1 : -1))
      .forEach((item, index) => {
        store.commit('UPDATE_REGION', {
          region: item,
          update: {
            index,
            displayIndex,
          },
        })
        if (!item.isNote) {
          displayIndex++
        }
      })
  },

  /**
   * Accepts regionId and sets the selectedRegion (using the current transcription).
   */
  setSelectedRegion(store, regionId) {
    logger.debug('setting selected region', regionId)
    store.commit('SET_SELECTED_REGION_ID', regionId)
  },

  // Used for when updates happen to issues, the region list is updated properly
  // updateSelectedRegion(store, regionId) {

  // },

  /**
   * Wrapper for `updateRegionById`.
   */
  async updateRegion(store, update) {
    console.log('updateRegion called', update)
    const region = store.getters.selectedRegion
    store.dispatch('updateRegionById', {
      ...update,
      id: region.id,
    })
  },

  async updateRegionById(store, update) {
    assert.ok(update.id, 'update.id must be provided')
    // console.log('updateRegionById', update)
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
      Timeout.set(
        'ds-outbox-time',
        () => {
          store.dispatch('enqueueRegionUpdate', regionId)
        },
        saveState.SAVE_RETRY,
      )
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
    const keysToEncode = ['text', 'issues', 'comments', 'regionAnalysis']
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
    // console.log('to DataStore', valuesToUpdate)
    const dbOriginal = await DataStore.query(Region, regionId)
    const copy = Region.copyOf(dbOriginal, (toUpdate) => {
      for (const key of Object.keys(valuesToUpdate)) {
        toUpdate[key] = valuesToUpdate[key]
      }
    })
    await DataStore.save(copy)

    // also update the transcription
    store.dispatch('updateTranscription', {
      userLastUpdated: user.name,
    })
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
    if (incoming.start || incoming.end) {
      if (incoming.start !== existing.start || incoming.end !== existing.end) {
        // TODO: this can be further optimized to only update
        // when the start time goes below/above neighbor regions
        resetIndexes = true
      }
    }
    console.log('commitRegionUpdate, reset indices? ', resetIndexes)
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

    // also update the transcription
    const user = await UserService.getUser()
    store.dispatch('updateTranscription', {
      userLastUpdated: user.name,
    })
  },
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

  SET_ISSUE_MAP(context, map) {
    Vue.set(context, 'issueMap', map)
  },

  // Update is { regionId, issues }
  // UPDATE_ISSUE_MAP_FOR_REGION(context, update) {
  //   const { regionId, issues } = update
  //   // Vue.set(context.issueMap, regionId, []);

  //   context.issueMap[regionId] = [...issues]
  // },

  SET_SELECTED_ISSUE(context, issue) {
    Vue.set(context, 'selectedIssue', issue)
  },

  SET_SELECTED_REGION_ID(context, regionId) {
    Vue.set(context, 'selectedRegionId', regionId)
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
