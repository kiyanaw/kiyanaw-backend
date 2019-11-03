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

Amplify.configure(awsmobile)
Vue.use(AmplifyPlugin, AmplifyModules)
Vue.use(VueRouter)
Vue.config.productionTip = false

new Vue({
  router,
  store
}).$mount('#app')
