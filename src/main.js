import Vue from 'vue'
import VueRouter from 'vue-router'
import vuetify from './plugins/vuetify'
import router from './router'
import store from './store/index'
import 'babel-polyfill'

import { Amplify } from 'aws-amplify'
import aws_exports from './aws-exports'
import { applyPolyfills, defineCustomElements } from '@aws-amplify/ui-components/loader'

Amplify.configure({
  ...aws_exports
})

applyPolyfills().then(() => {
  defineCustomElements(window)
})

Vue.config.ignoredElements = [/amplify-\w*/]

Amplify.Logger.LOG_LEVEL = 'DEBUG'

Vue.use(VueRouter)

Vue.config.productionTip = false

new Vue({
  router,
  store,
  vuetify,
}).$mount('#app')
