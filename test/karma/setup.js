require('jsdom-global')()
window.Date = Date

const Vue = require('vue')
const Vuetify = require('vuetify')
Vue.use(Vuetify)
