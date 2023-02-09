import { DataStore } from 'aws-amplify'
import { Transcription, TranscriptionContributor, Region, Contributor } from '../models'

import Vue from 'vue'
import Timeout from 'smart-timeout'
import assert from 'assert'

// TODO: incorporate this
import transcriptionService from '../services/transcriptions'
import userService from '../services/user'

import models from './models'
import logging from '../logging'

const logger = new logging.Logger('Transcription Store')


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
  // createRegion(store, region) {
  //   // const regions = store.getters.regions
  //   // regions.push({ ...region, version: 1 })
  //   // store.dispatch('setRegions', regions)

  //   // store.dispatch('updateTranscription', { regions })

  //   // const transcriptionId = store.getters.transcription.id
  //   // transcriptionService
  //   //   .createRegion(transcriptionId, region)
  //   //   .catch(function (error) {
  //   //     console.error('Failed to create region', error)
  //   //   })
  //   //   .then(() => {
  //   //     store.dispatch('setSaved', true)
  //   //   })
  // },

  deleteRegion(store) {
    const transcriptionId = store.getters.transcription.id
    const region = store.getters.selectedRegion

    const regions = store.getters.regions.filter((item) => item.id != region.id)
    store.dispatch('setRegions', regions)
    store.dispatch('setSelectedRegion', null)

    transcriptionService
      .deleteRegion(transcriptionId, region)
      .catch((error) => {
        console.error(error)
        alert('Failed to delete region, refresh and try again.')
        logger.error('Failed to delete region', region.id)
        // TODO: pop region back into list?
      })
      .then(() => {
        store.dispatch('setSaved', true)
      })
  },

  /**
   * SAVE ACTIONS
   * Region updates happen in their own store, but saving happens here
   */
  saveRegion(store, region) {
    if (store.getters.signedIn) {
      logger.debug('save region triggered', store, region)

      // Timeout.clear('save-region-timer')
      // Timeout.set(
      //   'save-region-timer',
      //   async () => {



      //     // transcriptionService
      //     //   .updateRegion(store.getters.transcription.id, region)
      //     //   .then(() => {
      //     //     logger.log('Region saved!')
      //     //     store.dispatch('setSaved', true)
      //     //   })
      //     //   .catch((error) => {
      //     //     logger.error('Error saving region', region, error)
      //     //     alert('Error saving that region, change the region to try again')
      //     //   })
      //     // mark the last saved user on the transcription here
      //     store.dispatch('updateTranscription', { userLastUpdated: region.userLastUpdated })
      //   },
      //   250,
      // )
    } else {
      logger.info('Unable to save, user not authenticated')
    }
  },

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
    // regions = regions
    //   .map((item) => {
    //     return new models.RegionModel(item)
    //   })

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
    transcription.peaks = await actions.loadPeaksData(store, transcription.source)

    store.dispatch('setTranscription', transcription)
    store.dispatch('setRegions', regions)
    store.dispatch('subscribeRegions', transcription.id)

    // TODO: this needs tests
    // set up subscription for Transcription
    const user = await userService.getUser()
    DataStore.observe(Transcription, transcription.id).subscribe((message) => {
      const localUser = user.name
      const remoteUser = message.element.userLastUpdated
      if (message.opType === 'UPDATE') {
        // only update if it's a remote update
        if (remoteUser !== localUser) {
          console.log('got remote update for transcription!', remoteUser)
          console.log(message)
          store.commit('UPDATE_TRANSCRIPTION', message.element)
        }
      }
    })
    

    let lastUpdate = `${+new Date()}`
    console.log('lastUpdate', lastUpdate)

    DataStore.observeQuery(Region, (r) => r.transcriptionId.eq(transcription.id)).subscribe((snapshot) => {
      const { items } = snapshot
      const updated = items.filter((item) => item.dateLastUpdated > lastUpdate && item.userLastUpdated !== user.name)
      console.log('updated', updated)
      updated.forEach((item) => {
        item = new models.RegionModel(item)
        // record the new `lastUpdate`
        if (item.dateLastUpdated > lastUpdate) {
          lastUpdate = item.dateLastUpdated
        }
        // update the region locally if need be
        const existing = store.getters.regionById(item.id)

        // don't overwrite indexes with `undefined` values
        delete item.index 
        delete item.displayIndex

        console.log('existing', existing, item)
        if (existing) {
          if (item.dateLastUpdated > existing.dateLastUpdated) {
            store.commit('UPDATE_REGION', {region: existing, update: item})
          }
        } else {
          //
        }
        // if (item.dateLastUpdated > store.getters.regionById(item.id).dateLastUpdated)
      })

    })


    // window.subscription = DataStore.observe(Region).subscribe((message) => {
    //   console.log('region realtime update', message)
    // })


  },

  // TODO: test this
  async loadPeaksData(store, source) {
    const peaks = await fetch(`${source}.json`)
    return await peaks.json()
  },

  // TODO: test this
  subscribeRegions(store, transcriptionId) {
    // DataStore.observeQuery(Region, (region) =>
    //   region.transcriptionId.eq('4454e340'),
    // ).subscribe((snapshot) => {
    //   const { items } = snapshot
    //   console.log(items)
    // })
    console.log(transcriptionId)
    store.dispatch

    // const subscription = DataStore.observeQuery(
    //   Region,
    //   (region) => region.transcriptionId.eq('4454e340')
    // ).subscribe((snapshot) => {
    //   const { items, isSynced } = snapshot
    //   console.log(`[Snapshot] item count: ${items.length}, isSynced: ${isSynced}`)
    // })
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

    // TODO: conver to store.dispatch()
    // store.commit('SET_TRANSCRIPTIONS', transcriptions)
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
}
