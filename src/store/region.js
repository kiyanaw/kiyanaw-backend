import { DataStore } from 'aws-amplify'
import { Region, Transcription } from '../models'
import * as assert from 'assert'

import Vue from 'vue'
// import Timeout from 'smart-timeout'

import Lexicon from '../services/lexicon'
import UserService from '../services/user'
// import TranscriptionService from '../services/transcriptions'
import logging from '../logging'
import EventBus from './bus'
import models from './models'

const logger = new logging.Logger('Region Store')

/**
 * Special queue outside the normal store just used to track unlocking.
 */
// const unlockQueue = []

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
    return Object.values(context.regionMap)
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
      console.log('byId', regionId, context.regionMap)
      window.context = context
      if (context.regionMap) {
        console.log('Has displayindex: ', context.regionMap[regionId].displayIndex)
        return context.regionMap[regionId]
        // return Object.values(context.regionMap)
        //   .filter((region) => region.id === regionId)
        //   .pop()
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

  // processUnlockQueue() {
  //   logger.debug(`Processing unlock queue, ${unlockQueue.length} items`)
  //   while (unlockQueue.length) {
  //     const unlock = unlockQueue.pop()
  //     unlock()
  //   }
  // },

  async createRegion(store, region) {
    const regions = store.getters.regions
    regions.push({ ...region })
    // store.dispatch('setRegions', regions)
    // store.dispatch('updateTranscription', { regions })

    
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
    
    console.log('creating new region', input)
    await DataStore.save(
      new Region(input),
    )

  },

  /**
   * Regions for the current transcription.
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
        // map[`${region.index}-${region.id}`] = region
        map[`${region.id}`] = region
        return region
      })
      // .map((item) => {
      //   map[`${item.index}-${item.id}`] = item
      //   return item
      // })

    store.commit('SET_REGION_MAP', map)
    console.log('!! Set region map')

    store.commit('SET_REGIONS', regions)

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

  /**
   * Accepts regionId and sets the selectedRegion (using the current transcription).
   */
  setSelectedRegion(store, regionId) {
    const region = store.getters.regionById(regionId)
    logger.info('setting selected region', regionId)
    store.commit('SET_SELECTED_REGION', region)
  },

  async updateRegionById(store, update) {
    assert.ok(update.id, 'region ID must be provided')
    // const update = input.update
    
    const regionId = update.id
    delete update.id

    logger.info('Updating region by Id', regionId)
    const region = store.getters.regionById(regionId)
    store.commit('UPDATE_REGION', { region, update })

    const original = await DataStore.query(Region, regionId)
    console.log('original', original)
    await DataStore.save(
      Region.copyOf(original, (toUpdate) => {
        toUpdate.dateLastUpdated = `${Date.now()}`
        for (const key of Object.keys(update)) {
          toUpdate[key] = update[key]
        }
        logger.info('Region saved', toUpdate)
      }),
    )

    // TODO: fire off dispatch update transcription

    // --- old code/

    // now that the update has fired, grab the region again
    // const updated = store.getters.regi onById(input.id)
    // store.dispatch('saveRegion', updated)
  },

  /**
   * Trigger region updates for the selected region.
   * TODO: this is ambiguous and confused with non-specific region updates - fix it.
   * TODO: this update takes update object {id, start, end} differs from updateRegionById
   */
  async updateRegion(store, update) {
    console.error('changing contenst!')
    logger.info('region updated', update)

    throw new Error('Move update logic to updateRegionById')

    // const region = store.getters.selectedRegion
    // console.log(region)
    // const original = await DataStore.query(Region, region.id)

    // keep a pre-save copy that doesn't have any JSON-serialization
    // const presaveUpdate = { ...update }

    // DataStore.save(
    //   Region.copyOf(original, (updated) => {
    //     updated.dateLastUpdated = `${Date.now()}`
    //     console.error('saved date')

    //     for (const key of Object.keys(update)) {
    //       // console.warn('updating key', key)
    //       if (key === 'text') {
    //         update[key] = JSON.stringify(update[key])
    //       }
    //       updated[key] = update[key]
    //     }

    //     console.log('Finished update', updated.text)
    //   }),
    // )

    // DataStore.save(
    //   Region.copyOf(original, (updated) => {
    //     updated.dateLastUpdated = `${Date.now()}`
    //     console.log('Finished update', updated.text)
    //   }),
    // )

    // store.commit('UPDATE_REGION', { region, presaveUpdate })
  },

  initRegionSubscriptions(store, transcriptionId) {
    console.log(store, transcriptionId, DataStore, Region)
    /** this is not providing accurate data */
    // DataStore.observeQuery(Region, (r) => r.transcriptionId('eq', transcriptionId), {
    //   sort: (s) => s.dateLastUpdated('DESCENDING'),
    // }).subscribe((snapshot) => {
    //   const { items, isSynced } = snapshot
    //   console.warn(`[Snapshot] item count: ${items.length}, isSynced: ${isSynced}`)
    //   // console.log('items', items)
    //   console.log(items.shift())
    // })

    // DataStore.observe(Region).subscribe((msg) => {
    //   if (msg.element.transcriptionId !== transcriptionId) {
    //     return
    //   }
    //   if (msg.opType === 'UPDATE') {
    //     store.dispatch('onRealtimeRegionChange', msg.element)
    //   } else if (msg.opType === 'CREATE') {
    //     console.warn('TODO: create region')
    //   } else {
    //     console.warn('Unhandled optype: ', msg.opType)
    //   }
    // })
  },

  onRealtimeRegionChange(store, incoming) {
    const selectedRegion = store.getters.selectedRegion

    // unwrap incoming model
    incoming = JSON.parse(JSON.stringify(incoming))

    // deserialize text field
    if (incoming.text && !incoming.text.map) {
      incoming.text = JSON.parse(incoming.text)
    }

    if (incoming.issues && !incoming.issues.map) {
      incoming.issues = JSON.parse(incoming.issues)
    }

    if (incoming.id === selectedRegion.id) {
      console.warn('change:', incoming.text.map((item) => item.insert).join(' '))
      EventBus.$emit('realtime-region-changez', incoming)
    }
    // set content on store
    // const region = store.getters.regionById(incoming.id)
    // store.commit('UPDATE_REGION', { region, update: incoming })
  },
}

const mutations = {
  SET_LOCK(context, update) {
    logger.debug('Setting lock', update.key)
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
    const region = update.region
    // const id = `${region.index}-${region.id}`
    const id = `${region.id}`
    const existing = context.regionMap[id]
    console.log('existing', existing)
    const whole = new models.RegionModel(Object.assign(existing, update.update))
    console.log('whole', whole)
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
