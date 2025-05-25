const esClient = require('elasticsearch').Client({
  host: 'https://search-indexregiondata-lqatyzsxiuhepcfidwldyiebh4.us-east-1.es.amazonaws.com',
  connectionClass: require('http-aws-es'),
})

module.exports = {
  client: esClient,
}
