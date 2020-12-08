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

  transcriptionRegionById(context) {
    return (regionId) => {
      if (context.transcription) {
        return context.transcription.regions.filter((region) => region.id === regionId).pop()
      } else {
        return null
      }
    }
  },

  saved(context) {
    return context.saved
  },
}

const actions = {
  loadTranscriptions(store) {
    transcriptionService.listTranscriptions().then((results) => {
      logger.info('Got transcriptions', results)
      store.commit('SET_TRANSCRIPTIONS', results)
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
          })
          .catch((error) => {
            logger.error('Error saving region', region, error)
          })

        store.dispatch('saveTranscription')
      },
      5000,
    )
  },

  saveTranscription(store) {
    store.commit('UPDATE_TRANSCRIPTION', { dateLastUpdated: +new Date() })

    // tweak the transcription for saving
    const transcription = { ...store.getters.transcription }

    console.log('saving transcription', transcription)

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
      3000,
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

  // TOUCH_TRANSCRIPTION_UPDATED_DATE(context) {
  //   context.transcription.dateLastUpdated = +new Date()
  // },

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
