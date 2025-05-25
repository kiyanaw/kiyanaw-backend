const assert = require('assert').strict

const regionHandler = require('./region')



describe('regionHandler', function () {
  describe('resolveRegionText', function () {
    it('should just accept the text if both fields are the same', function () {
      const oldItem = {regionText: 'This is some text from ben'}
      const newItem = {regionText: 'This is some text from ben'}

      const result = regionHandler.handleUpdateRegion(oldItem, newItem)

      assert.equal(result.action, 'RESOLVE')
      assert.equal(result.item.regionText, 'This is some text from ben')
    })

    it.only('should resolve a change from both inputs', function () {
      const oldItem = { regionText: 'This iss some text from ben' }
      const newItem = { regionText: 'This is some texts from ben' }

      const result = regionHandler.handleUpdateRegion(oldItem, newItem)

      assert.equal(result.action, 'RESOLVE')
      assert.equal(result.item.regionText, 'This is same texts from ben')
    })
  })
})
