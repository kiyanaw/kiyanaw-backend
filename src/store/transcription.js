import { DataStore } from 'aws-amplify'
import { Transcription, TranscriptionContributor, Region, Contributor } from '../models'

import Vue from 'vue'
import Timeout from 'smart-timeout'
import assert from 'assert'

import userService from '../services/user'

import models from './models'
import logging from '../logging'
import EventBus from './bus'

const logger = new logging.Logger('Transcription Store')

// tracks the last Region update
let LAST_REGION_UPDATE = `${+ new Date()}`


const state = {
  transcription: null,
  transcriptions: [],
  saved: false,
}

const getters = {
  transcription(context) {
    return context.transcription
  },

  transcriptions(context) {
    return context.transcriptions
  },

  saved(context) {
    return context.saved
  },
}

const actions = {
  /**
   * Loads a transcription and associated regions based on `transcriptionId`.
   *
   * @param {Object} store
   * @param {String} transcriptionId
   */
  async loadTranscription(store, transcriptionId) {
    assert.ok(store, 'store must be provided')
    assert.ok(transcriptionId, 'transcriptionId must be provided')
    let [transcription, regions] = await Promise.all([
      DataStore.query(Transcription, transcriptionId),
      DataStore.query(Region, (r) => r.transcription.id.eq(transcriptionId)),
    ])

    transcription = new models.TranscriptionModel(transcription)

    // TODO: convert to store.dispatch('', ...)
    actions.onLoadTranscription(store, transcription, regions)
  },

  /**
   * Do not call directly.
   *
   * Handler for when transcriptions are loaded, checks user permissions and sets
   * the newly-loaded data on the store.
   *
   *
   * @param {Object} store
   * @param {Object} transcription
   * @param {Array<Object>} regions
   */
  async onLoadTranscription(store, transcription, regions) {
    assert.ok(store, 'store must be provided')
    assert.ok(transcription, 'transcription must be provided')
    assert.ok(regions, 'regions must be provided')
    transcription.peaks = await actions.loadPeaksData(store, transcription.source)

    store.dispatch('setTranscription', transcription)
    store.dispatch('setRegions', regions)

    // TODO: maybe move this all to .initSubscriptions() or something
    // subscribe to Transcription changes
    DataStore.observe(Transcription, transcription.id).subscribe((message) => {
      actions.onTranscriptionSubscription(store, message)
    })

    // subscribe to Region changes for this transcription
    DataStore.observeQuery(Region, (r) => r.transcriptionId.eq(transcription.id)).subscribe(
      (snapshot) => {
        actions.onRegionSubscription(store, snapshot)
      },
    )

    // subscription to watch for deleted regions
    DataStore.observe(Region).subscribe((message) => {
      actions.onDeleteRegionSubscription(store, message)
    })
  },

  // TODO: needs tests
  async onDeleteRegionSubscription(store, message) {
    console.log('message', message)
    if (message.opType === 'DELETE') {
      const transcriptionId = store.getters.transcription.id
      if (
        message.model.name === 'Region' &&
        message.element.transcriptionId === transcriptionId
      ) {
        const regionId = message.element.id
        store.commit('DELETE_REGION', regionId)
        store.dispatch('resetRegionIndices')
      }
    }
  },

  /**
   * Handle realtime transcription updates from DataStore.
   */
  async onTranscriptionSubscription(store, message) {
    const user = await userService.getUser()
    const localUser = user.name
    const remoteUser = message.element.userLastUpdated
    if (message.opType === 'UPDATE') {
      // only update if it's a remote update
      if (remoteUser !== localUser) {
        store.commit('UPDATE_TRANSCRIPTION', message.element)
      }
    }
  },

  /**
   * Sets the timestamp of the last incoming update for regions. Helper for testing.
   */
  setLastRegionUpdate(value) {
    LAST_REGION_UPDATE = value
  },

  /**
   * TODO: move this to store/region
   * Handles realtime region updates from DataStore.
   */
  async onRegionSubscription(store, snapshot) {
    const user = await userService.getUser()
    const { items } = snapshot
    const updated = items.filter(
      (item) => item.dateLastUpdated > LAST_REGION_UPDATE && item.userLastUpdated !== user.name,
    )

    updated.forEach((item) => {
      item = new models.RegionModel(item)
      // record the new `lastUpdate`
      if (item.dateLastUpdated > LAST_REGION_UPDATE) {
        actions.setLastRegionUpdate(item.dateLastUpdated)
      }
      // update the region locally if need be
      const existing = store.getters.regionById(item.id)
      // don't overwrite indexes with `undefined` values
      delete item.index
      delete item.displayIndex

      if (existing) {
        if (item.dateLastUpdated > existing.dateLastUpdated) {

          store.dispatch('commitRegionUpdate', {
            update: item,
            region: existing
          })

          // only dispatch if the regionId matches the current selected region
          if (existing.id === store.getters.selectedRegion.id) {
            EventBus.$emit('realtime-region-update', item)
          }
        }
      } else {
        store.dispatch('commitRegionAdd', item)
      }
    })
  },

  // TODO: test this
  async loadPeaksData(store, source) {
    const peaks = await fetch(`${source}.json`)
    return await peaks.json()
  },

  /**
   * Initialize DataStore and load transcriptions for the current user.
   *
   * @param {Object} store
   */
  async loadTranscriptions(store) {
    await actions.initForLoading()

    const profile = await userService.getProfile()
    let transcriptions = await DataStore.query(Transcription, (t) =>
      t.contributors.contributor.id.eq(profile.username),
    )
    transcriptions = transcriptions.map((item) => {
      return new models.TranscriptionModel(item)
    })

    store.dispatch('setTranscriptions', transcriptions)
  },

  /**
   * Add sync operations here that will prime DataStore for querying.
   */
  async initForLoading() {
    await DataStore.query(TranscriptionContributor)
  },

  /**
   * TODO: test / integration test
   */
  async addEditor(store, username) {
    const transcription = await DataStore.query(Transcription, store.getters.transcription.id)
    const contributor = await DataStore.query(Contributor, username)
    const link = await DataStore.save(
      new TranscriptionContributor({
        transcription,
        contributor,
      }),
    )

    console.log('saved editor', link)
  },

  /**
   * TODO: test / integration test
   */
  async removeEditor(store, username) {
    const link = await DataStore.query(TranscriptionContributor, (tc) =>
      tc.and((tc) => [
        tc.transcriptionID.eq(store.getters.transcription.id),
        tc.contributorID.eq(username),
      ]),
    )
    if (link && link.length) {
      const deleteId = link[0].id
      DataStore.delete(TranscriptionContributor, deleteId)
    }
  },

  // TODO: this needs a better name
  setSaved(store, saved) {
    store.commit('SET_SAVED', saved)
    logger.debug('saved', saved)

    Timeout.clear('clear-saved-value-timer')
    Timeout.set(
      'clear-saved-value-timer',
      () => {
        store.dispatch('setSaved', false)
      },
      10000,
    )
  },

  setTranscription(store, transcription) {
    store.commit('SET_TRANSCRIPTION', transcription)
  },

  setTranscriptions(store, transcriptions) {
    store.commit('SET_TRANSCRIPTIONS', transcriptions)
  },

  /**
   * TODO: test / integration test
   */
  async updateTranscription(store, update) {
    // throttle updates so DataStore doesn't shit the bed
    Timeout.clear('update-transcription-timer')
    Timeout.set(
      'update-transcription-timer',
      async () => {
        const original = await DataStore.query(Transcription, store.getters.transcription.id)
        await DataStore.save(
          Transcription.copyOf(original, (toUpdate) => {
            toUpdate.dateLastUpdated = `${Date.now()}`
            for (const key of Object.keys(update)) {
              toUpdate[key] = update[key]
            }
            logger.info('Transcription saved', toUpdate)
          }),
        )
      },
      250,
    )
  },
}

const mutations = {
  SET_SAVED(context, saved) {
    Vue.set(context, 'saved', saved)
  },

  SET_TRANSCRIPTION(context, transcription) {
    Vue.set(context, 'transcription', transcription)
  },

  SET_TRANSCRIPTIONS(context, transcriptions) {
    Vue.set(context, 'transcriptions', transcriptions)
  },

  UPDATE_TRANSCRIPTION(context, update) {
    const updated = Object.assign(context.transcription, update)
    context.transcription = updated
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
  LAST_REGION_UPDATE
}
