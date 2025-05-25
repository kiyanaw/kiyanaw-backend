const toCircumflex = (item) => {
  console.log('circumflexing', item)
  return item.replace(/ā/g, 'â').replace(/ī/g, 'î').replace(/ō/g, 'ô').replace(/ē/g, 'ê')
}

const okResponse = () => {
  return {
    statusCode: 200,
    body: '{"message": "ok"}',
  }
}

module.exports = {
  toCircumflex,
  okResponse,
}
