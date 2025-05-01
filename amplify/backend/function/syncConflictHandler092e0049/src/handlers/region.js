const Delta = require('quill-delta').default

function resolveRegionText(oldItem, newItem) {

  // console.log(oldItem, newItem)
  // const oldDelta = new Delta().insert(oldItem.regionText)
  // const newDelta = new Delta().insert(newItem.regionText)

  // console.log(oldDelta, newDelta)
  
  // const oldNewDiff = oldDelta.diff(newDelta)
  // const firstFinal = oldDelta.compose(oldNewDiff)

  // const newOldDiff = newDelta.diff(firstFinal)
  // const secondFinal = firstFinal.compose(newOldDiff)



  // console.log('final', secondFinal)

  // return secondFinal.ops.map((item) => item.insert).join(' ')


  const oldDelta = new Delta().insert(oldItem.regionText)
  const newDelta = new Delta().insert(newItem.regionText)

  const oldAgainstNew = oldDelta.diff(newDelta)
  const newDiffOld = newDelta.diff(oldDelta)

  console.log(oldAgainstNew)
  console.log(newDiffOld)



}

function resolveRegionAnalysis(oldItem, newItem) {

}

function resolveTranslation(oldItem, newItem) {

}


function handleUpdateRegion(oldItem, newItem) {
  let item = {}
  const action = 'RESOLVE'

  // const resolveFields = ['regionText']
  const resolvers = {
    'regionText': resolveRegionText,
    'regionAnalysis': resolveRegionAnalysis,
    'translation': resolveTranslation,
  }

  const keys = Object.keys(oldItem)
  keys.forEach((key) => {
    if (Object.keys(resolvers).includes(key)) {
      item[key] = resolvers[key](oldItem, newItem)
    } else {
      item[key] = newItem[key]
    }
  })
  return { item, action }
}

function handleDeleteRegion(oldItem, newItem) {

}

function handleCreateRegion(newItem) {

}

module.exports = {
  handleUpdateRegion,
  handleCreateRegion,
  handleDeleteRegion
}