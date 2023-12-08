import Vue from 'vue'
import Vuex from 'vuex'


// region store has to be first for sync expressions
import region from './region'

// these come second
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
