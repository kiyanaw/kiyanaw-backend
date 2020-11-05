import Vue from 'vue'

import userService from '../services/user'

// TODO: how to test this
const state = {
  signedIn: false,
  user: null,
}

const getters = {
  user(context) {
    return context.user
  },
  signedIn(context) {
    return context.signedIn
  },
}

const actions = {
  setUser(store, user) {
    if (!user) {
      userService.flush()
      store.commit('SET_USER', null)
      store.commit('SET_SIGNED_IN', false)
    } else {
      store.commit('SET_USER', user)
      store.commit('SET_SIGNED_IN', true)
    }
  },

  setSignedIn(store, signedIn) {
    store.commit('SET_SIGNED_IN', signedIn)
  },

  async getUser(store) {
    // don't block
    userService.getUser().then((user) => {
      if (user) {
        store.dispatch('setUser', user)
      }
    })
  },
}

const mutations = {
  SET_USER(context, user) {
    Vue.set(context, 'user', user)
  },
  SET_SIGNED_IN(context, signedIn) {
    Vue.set(context, 'signedIn', signedIn)
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
