import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const SET_USER = 'SET_USER'
const SET_SIGNED_IN = 'SET_SIGNED_IN'

export default new Vuex.Store({
  state: {
    user: null,
    signedIn: false
  },
  mutations: {
    [SET_USER]: (state, user) => {
      state.user = user
    },
    [SET_SIGNED_IN]: (state, signedIn) => {
      state.signedIn = signedIn
    }
  },
  actions: {
    setUser: (context, user) => {
      context.commit(SET_USER, user)
    },
    setSignedIn: (context, signedIn) => {
      context.commit(SET_SIGNED_IN, signedIn)
    }
  }
})
