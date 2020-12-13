import Vue from 'vue'
import Timeout from 'smart-timeout'

// TODO: incorporate this
import transcriptionService from '../services/transcriptions'
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
    regions.push(region)
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

  /**
   * SAVE ACTIONS
   * Region updates happen in their own store, but saving happens here
   */
  saveRegion(store, region) {
    logger.debug('save region triggered', store, region.id)

    Timeout.clear('save-region-timer')
    Timeout.set(
      'save-region-timer',
      () => {
        logger.info('Save region triggered', region)
        transcriptionService
          .updateRegion(store.getters.transcription.id, region)
          .then(() => {
            logger.info('Region saved!')
            store.dispatch('setSaved', true)
          })
          .catch((error) => {
            logger.error('Error saving region', region, error)
          })

        store.dispatch('saveTranscription')
      },
      2000,
    )
  },

  saveTranscription(store) {
    store.commit('UPDATE_TRANSCRIPTION', { dateLastUpdated: +new Date() })

    // tweak the transcription for saving
    const transcription = { ...store.getters.transcription }

    // TODO: after transcription class is moved to store, move these methods
    delete transcription.data
    delete transcription.regions

    logger.info('Save transcription triggered', transcription)
    transcriptionService
      .updateTranscription(transcription)
      .then(() => {
        logger.info('Transcription saved!')
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
      2000,
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
