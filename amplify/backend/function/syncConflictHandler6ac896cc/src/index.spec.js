const assert = require('assert')
const sinon = require('sinon')

const handler = require('./index').handler
const exampleEvent = require('./example-event')

describe('Conflict Handler', function () {
  it('just uses update if the users are the same')
  /**
   * Original and updater change same character.
   */
  it('Original and updater change same character.', async function () {
    const event = { ...exampleEvent }
    event.existingItem.text = '[{"insert":"This is the sold content \\n"}]'
    event.arguments.input.text = '[{"insert":"This is the bold content \\n"}]'

    const result = await handler(event)
    assert.equal(result.action, 'RESOLVE')
    assert.equal(result.item.text, '[{"insert":"This is the sbold content \\n"}]')
    assert.equal(result.item._version, 341)
    assert.equal(result.item.userLastUpdated, 'otheruser')
    // TODO: dateLastUpdated probably will change
  })

  /**
   * Original and updater change different characters.
   */
  it('Original and updater change different characters.', async function () {
    const event = { ...exampleEvent }
    event.existingItem.text = '[{"insert":"This is the sold content \\n"}]'
    event.arguments.input.text = '[{"insert":"This is the older content \\n"}]'

    const result = await handler(event)
    assert.equal(result.action, 'RESOLVE')
    assert.equal(result.item.text, '[{"insert":"This is the solder content \\n"}]')
    assert.equal(result.item._version, 341)
    assert.equal(result.item.userLastUpdated, 'otheruser')
    // TODO: dateLastUpdated probably will change
  })

  /**
   * Original changes format, updated adds character.
   */
  it('Original changes format, updated adds character.', async function () {
    const event = { ...exampleEvent }
    event.existingItem.text =
      '[{"insert":"This is the old content \\n", "attributes": {"known-word": true}}]'
    event.arguments.input.text = '[{"insert":"This is the bold content \\n"}]'

    const result = await handler(event)
    assert.equal(result.action, 'RESOLVE')
    assert.equal(
      result.item.text,
      JSON.stringify([
        {
          insert: 'This is the bold content \n',
          attributes: { 'known-word': true },
        },
      ]),
    )
    assert.equal(result.item._version, 341)
    assert.equal(result.item.userLastUpdated, 'otheruser')
    // TODO: dateLastUpdated probably will change
  })

  /**
   * Original adds character, updater changes format.
   */
  it('Original adds character, updater changes format.', async function () {
    const event = { ...exampleEvent }
    event.existingItem.text = '[{"insert":"This is the bold content \\n"}]'
    event.arguments.input.text =
      '[{"insert":"This is the old content \\n", "attributes": {"known-word": true}}]'

    const result = await handler(event)
    assert.equal(result.action, 'RESOLVE')
    assert.equal(
      result.item.text,
      JSON.stringify([
        {
          insert: 'This is the bold content \n',
          attributes: { 'known-word': true },
        },
      ]),
    )
    assert.equal(result.item._version, 341)
    assert.equal(result.item.userLastUpdated, 'otheruser')
    // TODO: dateLastUpdated probably will change
  })

  /**
   * Original user changes format, other user adds a character OUTSIDE of format.
   */
  it('Original user changes format, other user adds a character OUTSIDE of format.', async function () {
    const event = { ...exampleEvent }
    event.existingItem.text = JSON.stringify([
      { insert: 'This is ' },
      { attributes: { 'known-word': 'true' }, insert: 'some' },
      { insert: ' content \n' },
    ])
    event.arguments.input.text = '[{"insert":"This is some contents \\n"}]'

    const result = await handler(event)
    assert.equal(result.action, 'RESOLVE')
    assert.equal(
      result.item.text,
      JSON.stringify([
        { insert: 'This is ' },
        { attributes: { 'known-word': 'true' }, insert: 'some' },
        { insert: ' contents \n' },
      ]),
    )

    assert.equal(result.item._version, 341)
    assert.equal(result.item.userLastUpdated, 'otheruser')
    // TODO: dateLastUpdated probably will change
  })

  /**
   * Original user changes string, other user updates format.
   */
  it('Original user changes string, other user updates format.', async function () {
    const event = { ...exampleEvent }
    event.existingItem.text = '[{"insert":"This is some contents \\n"}]'

    event.arguments.input.text = JSON.stringify([
      { insert: 'This is ' },
      { attributes: { 'known-word': 'true' }, insert: 'some' },
      { insert: ' content \n' },
    ])

    const result = await handler(event)
    assert.equal(result.action, 'RESOLVE')
    assert.equal(
      result.item.text,
      JSON.stringify([
        { insert: 'This is ' },
        { attributes: { 'known-word': 'true' }, insert: 'some' },
        { insert: ' contents \n' },
      ]),
    )

    assert.equal(result.item._version, 341)
    assert.equal(result.item.userLastUpdated, 'otheruser')
    // TODO: dateLastUpdated probably will change
  })

  /**
   * Original user adds character to string, updater changes format of SAME string.
   */
  it('Original user changes string, updater changes format of SAME string.', async function () {
    const event = { ...exampleEvent }
    event.existingItem.text = '[{"insert":"This is shome content \\n"}]'

    event.arguments.input.text = JSON.stringify([
      { insert: 'This is ' },
      { attributes: { 'known-word': 'true' }, insert: 'some' },
      { insert: ' content \n' },
    ])

    const result = await handler(event)
    assert.equal(result.action, 'RESOLVE')
    assert.equal(
      result.item.text,
      JSON.stringify([
        { insert: 'This is ' },
        { attributes: { 'known-word': 'true' }, insert: 'shome' },
        { insert: ' content \n' },
      ]),
    )

    assert.equal(result.item._version, 341)
    assert.equal(result.item.userLastUpdated, 'otheruser')
    // TODO: dateLastUpdated probably will change
  })
  /**
   * Original user changes format, updater changes string of SAME blot.
   */
  it('Original user changes format, updater changes string of SAME blot.', async function () {
    const event = { ...exampleEvent }
    event.existingItem.text = JSON.stringify([
      { insert: 'This is ' },
      { attributes: { 'known-word': 'true' }, insert: 'some' },
      { insert: ' content \n' },
    ])

    event.arguments.input.text = '[{"insert":"This is shome content \\n"}]'

    const result = await handler(event)
    assert.equal(result.action, 'RESOLVE')
    assert.equal(
      result.item.text,
      JSON.stringify([
        { insert: 'This is ' },
        { attributes: { 'known-word': 'true' }, insert: 'shome' },
        { insert: ' content \n' },
      ]),
    )

    assert.equal(result.item._version, 341)
    assert.equal(result.item.userLastUpdated, 'otheruser')
    // TODO: dateLastUpdated probably will change
  })

  /**
   * Users update two different blots
   */
  it.only('Users update two different blots.', async function () {
    const event = { ...exampleEvent }
    event.existingItem.text = JSON.stringify([
      { insert: 'This is ' },
      { attributes: { 'known-word': 'true' }, insert: 'some content \n' },
    ])

    event.arguments.input.text = JSON.stringify([
      { attributes: { 'known-word': 'true' }, insert: 'This is ' },
      { insert: 'some content \n' },
    ])

    const result = await handler(event)
    assert.equal(result.action, 'RESOLVE')

    // both items should have 'known-words'
    const resultText = JSON.parse(result.item.text)
    console.log(resultText)
    assert.equal(resultText.length, 2)

    assert.equal(resultText[0].insert, 'This is ')
    assert.deepEqual(resultText[0].attributes, { 'known-word': 'true' })
    assert.equal(resultText[1].insert, 'some content \n')
    assert.deepEqual(resultText[1].attributes, undefined)

    assert.equal(result.item._version, 341)
    assert.equal(result.item.userLastUpdated, 'otheruser')
    // TODO: dateLastUpdated probably will change
  })

  /**
   * Users update overlapping blots
   */
  it('Users update adjacent formats for blots.', async function () {
    const event = { ...exampleEvent }
    event.existingItem.text = JSON.stringify([
      { insert: 'This ' },
      { attributes: { 'known-word': 'true' }, insert: 'is some' },
      { insert: ' content here \n' },
    ])

    event.arguments.input.text = JSON.stringify([
      { insert: 'This is ' },
      { attributes: { 'known-word': 'true' }, insert: 'some content' },
      { insert: ' here \n' },
    ])

    const result = await handler(event)
    assert.equal(result.action, 'RESOLVE')

    // both items should have 'known-words'
    const resultText = JSON.parse(result.item.text)

    // console.log(resultText )
    assert.equal(resultText[0].insert, 'This is ')
    assert.deepEqual(resultText[0].attributes, undefined)
    assert.equal(resultText[1].insert, 'some content')
    assert.deepEqual(resultText[1].attributes, { 'known-word': "true" })
    assert.equal(resultText[2].insert, ' here \n')
    assert.deepEqual(resultText[2].attributes, undefined)
    
    assert.equal(result.item._version, 341)
    assert.equal(result.item.userLastUpdated, 'otheruser')
    // TODO: dateLastUpdated probably will change
  })

  it('one user updates text and the other updates issues')
  it('two users add an issue')
  it('two users comment on issues')
})
