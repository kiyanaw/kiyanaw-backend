// import {Vue, VueRouter} from 'vue'
import Vue from 'vue'
import VueRouter from 'vue-router'
import './plugins/vuetify'
import router from './router'
import store from './store'

import Amplify, * as AmplifyModules from 'aws-amplify'
import { AmplifyPlugin } from 'aws-amplify-vue'
import awsmobile from './aws-exports'
import EnvService from './services/env'

import VuePusher from 'vue-pusher'

Amplify.configure(awsmobile)
Vue.use(AmplifyPlugin, AmplifyModules)
Vue.use(VueRouter)

// TODO: load this API key separately
Vue.use(VuePusher, {
  api_key: '9d0e04094a934d7eaad8',
  options: {
    cluster: 'us3',
    forceTLS: true,
    authEndpoint: `https://m3inhc2wwk.execute-api.us-east-1.amazonaws.com/${EnvService.getEnvironmentName()}/auth`
    // authTransport: 'jsonp'
  }
})

Vue.config.productionTip = false

new Vue({
  router,
  store
}).$mount('#app')
