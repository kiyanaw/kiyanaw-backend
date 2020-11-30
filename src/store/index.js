import Vue from 'vue'
import Vuex from 'vuex'

import region from './region'
import transcription from './transcription'
import user from './user'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    region,
    transcription,
    user,
  },
})
