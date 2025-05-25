const axios = require('axios')

const clickInText = async (word) => {
  return axios.get(`https://sapir.artsrn.ualberta.ca/cree-dictionary/click-in-text?q=${word}`)
}

module.exports = {
  clickInText,
}
