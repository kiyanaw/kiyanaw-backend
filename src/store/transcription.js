import Vue from 'vue'
import Timeout from 'smart-timeout'

// TODO: incorporate this
import transcriptionService from '../services/transcriptions'
import userService from '../services/user'

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
  createRegion(store, region) {
    const regions = store.getters.regions
    regions.push({ ...region, version: 1 })
    store.dispatch('setRegions', regions)

    store.dispatch('updateTranscription', { regions })

    const transcriptionId = store.getters.transcription.id
    transcriptionService
      .createRegion(transcriptionId, region)
      .catch(function (error) {
        console.error('Failed to create region', error)
      })
      .then(() => {
        store.dispatch('setSaved', true)
      })
  },

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

  loadTranscriptions(store) {
    transcriptionService.listTranscriptions().then((results) => {
      logger.info('Got transcriptions', results)
      store.commit('SET_TRANSCRIPTIONS', results)
    })

    transcriptionService.listenForRegions((type, data) => {
      // store.dispatch()
      logger.info('Realtime region update', type, data)
    })
  },

  addEditor(store, username) {
    const transcription = store.getters.transcription
    userService
      .addTranscriptionEditor(transcription.id, username)
      .catch((error) => console.error('Unable to add editor', error))

    store.dispatch('updateTranscription', { editors: [...transcription.editors, username] })
  },

  removeEditor(store, username) {
    const transcription = store.getters.transcription
    const dbRecord = transcription.editorsDb.filter((item) => item.username === username).pop()
    console.log('db record', dbRecord)

    userService
      .removeTranscriptionEditor(dbRecord.id)
      .catch((error) => console.error('Unable to remove editor', error))

    const update = transcription.editors.filter((item) => !item === username)
    store.dispatch('updateTranscription', { editors: [...update] })
  },

  /**
   * SAVE ACTIONS
   * Region updates happen in their own store, but saving happens here
   */
  saveRegion(store, region) {
    if (store.getters.signedIn) {
      logger.debug('save region triggered', store, region)

      Timeout.clear('save-region-timer')
      Timeout.set(
        'save-region-timer',
        () => {
          logger.debug('Save region triggered', region)
          transcriptionService
            .updateRegion(store.getters.transcription.id, region)
            .then(() => {
              logger.log('Region saved!')
              store.dispatch('setSaved', true)
            })
            .catch((error) => {
              logger.error('Error saving region', region, error)
              alert('Error saving that region, change the region to try again')
            })
          // mark the last saved user on the transcription here
          store.dispatch('updateTranscription', { userLastUpdated: region.userLastUpdated })
        },
        1250,
      )
    } else {
      logger.info('Unable to save, user not authenticated')
    }
  },

  saveTranscription(store) {
    store.commit('UPDATE_TRANSCRIPTION', { dateLastUpdated: +new Date() })

    // tweak the transcription for saving
    const transcription = { ...store.getters.transcription }

    // TODO: after transcription class is moved to store, move these methods
    delete transcription.data
    delete transcription.regions
    delete transcription.editors
    delete transcription.editorsDb

    /**
     * Calculate issue count
     */
    const issueCount = store.getters.regions
      .filter((item) => item.issues.length)
      .map((item) => item.issues)
      .flat()
      .filter((item) => !item.resolved).length
    transcription.issues = `${issueCount}`

    /**
     * Calculate coverage
     */
    const coverage = Number(
      (
        (store.getters.regions.filter((item) => item.text.length).length /
          store.getters.regions.filter((item) => !item.isNote).length) *
        100
      ).toFixed(2),
    )
    transcription.coverage = coverage

    logger.debug('Save transcription triggered', transcription)
    logger.info('Transcription issue count', transcription.issues)
    logger.info('Transcription coverage', transcription.coverage)
    transcriptionService
      .updateTranscription(transcription)
      .then(() => {
        logger.debug('Transcription saved!')
        store.dispatch('setSaved', true)
      })
      .catch((error) => {
        logger.error('Error saving transcription', error)
      })
  },

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

    // tell the region store to update now
    store.dispatch('setRegions', transcription.regions)
  },

  updateTranscription(store, update) {
    store.commit('UPDATE_TRANSCRIPTION', update)

    Timeout.clear('save-transcription-timer')
    Timeout.set(
      'save-transcription-timer',
      () => {
        store.dispatch('saveTranscription')
      },
      500,
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
