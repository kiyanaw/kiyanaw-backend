const Vue = require('vue')
const Vuetify = require('vuetify')

Vue.default.use(Vuetify)

describe('App', function () {
  // bring in the tests
  require('./spec/rte.spec')
  require('./spec/region-form.spec')
})
