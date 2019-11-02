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
import UserService from './services/user'

Amplify.configure(awsmobile)
Vue.use(AmplifyPlugin, AmplifyModules)
Vue.use(VueRouter)

// Vue.use(VuePusher, {
//   api_key: '9d0e04094a934d7eaad8',
//   options: {
//     cluster: 'us3',
//     forceTLS: true,
//     // set dummy auth endpoint until after authentication
//     authEndpoint: `https://m3inhc2wwk.execute-api.us-east-1.amazonaws.com/{env}/auth?user={user}`
//   }
// })

Vue.config.productionTip = false

new Vue({
  router,
  store
}).$mount('#app')

