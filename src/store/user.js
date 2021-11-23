import Vue from 'vue'

import userService from '../services/user'

// TODO: how to test this
const state = {
  signedIn: false,
  user: null,
  profiles: [],
}

const getters = {
  user(context) {
    return context.user
  },
  signedIn(context) {
    return context.signedIn
  },
  profiles(context) {
    return context.profiles
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

  setProfiles(store, profiles) {
    store.commit('SET_PROFILES', profiles)
  },

  async getUser(store) {
    // don't block
    userService.getUser().then((user) => {
      if (user) {
        store.dispatch('setUser', user)
        // TODO: get/set user profile
        userService.getProfile().catch((error) => {
          console.error('Error checking for user profile', error)
        })
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
  SET_PROFILES(context, profiles) {
    Vue.set(context, 'profiles', profiles)
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
