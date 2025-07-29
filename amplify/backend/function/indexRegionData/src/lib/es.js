const esClient = require('elasticsearch').Client({
  host: 'https://' + process.env.OPENSEARCH_ENDPOINT,
  connectionClass: require('http-aws-es')
})

module.exports = {
  client: esClient,
}
