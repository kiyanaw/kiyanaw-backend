const Vue = require('vue')
const Vuetify = require('vuetify')

Vue.default.use(Vuetify)

describe('App', function () {
  require('./spec/audio-player.spec')
  require('./spec/region-form.spec')
  require('./spec/rte.spec')
  require('./spec/store.region.spec')
})
