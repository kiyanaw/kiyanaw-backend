// This is sample code. Please update this to suite your schema
// const editor = require('./helpers').editor
// const Quill = require('quill')
const Delta = require('quill-delta')


const Y = require('yjs')
const QuillBinding = require('y-quill').QuillBinding
const Diff = require('diff')

const createQuill = require('./helpers').createQuill

const setUpEditor = (y = new Y.Doc()) => {
  const type = y.getText('text')
  const editor = createQuill()
  const binding = new QuillBinding(type, editor)
  return {
    editor,
    binding,
    type,
  }
}

function mergeAttributes(existing, update) {
  let out
  if (existing || update) {
    out = {
      ...existing,
      ...update
    }
  }
  return out
}


exports.handler = async (event, context, callback) => {
  // only log if this is in AWS
  const inProduction = event.identity.accountId !== 'testing'
  if (inProduction) {
    console.log('Received event {}', JSON.stringify(event, 3));
  }

  let action, item;
  switch (event.resolver.field) {
    case 'updateRegion':
      // TODO: only run this if the users are different
      action = 'RESOLVE'
      item = event.existingItem

      item.userLastUpdated = event.newItem.userLastUpdated

      const input = event.arguments.input
      for (const key of Object.keys(input)) {
        /**
         * Handler for changing text.
         */
        if (key === 'text') {
          const existing = JSON.parse(event.existingItem.text)
          const update = JSON.parse(input.text)
          /**
           * Single 'insert' for both existing & update.
           */
          if (existing.length === update.length && existing.length == 1) {
            const eText = existing[0].insert
            const uText = update[0].insert
            const bits = Diff.diffChars(eText, uText)

            const updateAttributes = update[0].attributes
            const existingAttributes = existing[0].attributes

            item.text = JSON.stringify([{
              insert: bits.map((b) => b.value).join(''),
              attributes: mergeAttributes(existingAttributes, updateAttributes)
            }])

          /**
           * Single item in either existing or update (format changed).
           */
          } else if(existing.length === 1 || update.length === 1) {
            let base, incoming
            if (existing.length === 1) {
              base = existing
              incoming = update
            } else {
              base = update
              incoming = existing
            }
            
            const eText = base[0].insert
            const uFormatItem = incoming.filter((item) => item.attributes).pop()
            const uFormatText = uFormatItem.insert
            const uFormatAttributes = uFormatItem.attributes
            // find the index of the newly-formatted item in the existing text
            let formatStartIndex = eText.indexOf(uFormatText)
            let formatLength = uFormatText.length

            if (formatStartIndex < 0) {
              // if we're here, the format and the text change are in the same block
              // get the block of text from the baseline
              let eText = base[0].insert
              let newWord = base[0].insert
              // find the new word
              incoming.forEach((chunk) => {
                newWord = newWord.replace(chunk.insert, '')
              })
              formatStartIndex = eText.indexOf(newWord)
              formatLength = newWord.length

            }
            const editor = createQuill()
            editor.setContents(base)
            Object.keys(uFormatAttributes).forEach((key) => {
              editor.formatText(formatStartIndex, formatLength, key, uFormatAttributes[key])
            })

            item.text = JSON.stringify(editor.getContents().ops)
          /**
           * The full monty, something else changed.
           */
          } else {

            /**
             * For now we just largely apply the last update as "correct"
             */

            const eDelta = new Delta(existing)
            const uDelta = new Delta(update)
            const diff = eDelta.diff(uDelta)
            item.text = JSON.stringify(eDelta.compose(diff).ops)


          }
        }
        /**
         * Other possible keys
         *  - start
         *  - end
         *  - issues
         *  - translation
         *  - isNote
         */
      }

      break
    // case 'updatePost':
    //   if (event.existingItem.postId === '1') {
    //     action = 'RESOLVE';
    //     item = event.newItem;
    //   } else {
    //     action = 'REJECT';
    //   }
    //   break;
    // case 'deletePost':
    //   if (event.existingItem.postId === '1') {
    //     action = 'REMOVE';
    //   } else {
    //     action = 'REJECT';
    //   }
    //   break;
    // case 'addPost':
    //   if (event.existingItem.postId === '1') {
    //     action = 'RESOLVE';
    //     item = event.newItem;
    //   } else {
    //     action = 'REJECT';
    //   }
    //   break;
    default:
      throw new Error('Unknown Resolver')
  }
  return {
    action,
    item,
  };
};
