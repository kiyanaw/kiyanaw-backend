import Vue from 'vue'
import VueRouter from 'vue-router'
import vuetify from './plugins/vuetify'
import router from './router'
import store from './store/index'
import 'babel-polyfill'
// import VueMeta from 'vue-meta'

import Amplify, * as AmplifyModules from 'aws-amplify'
import { AmplifyPlugin } from 'aws-amplify-vue'
import awsmobile from './aws-exports'

Amplify.configure(awsmobile)
Vue.use(AmplifyPlugin, AmplifyModules)
Vue.use(VueRouter)
// Vue.use(VueMeta)

Vue.config.productionTip = false

new Vue({
  router,
  store,
  vuetify,
}).$mount('#app')
