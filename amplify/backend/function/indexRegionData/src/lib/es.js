const { Client } = require('@opensearch-project/opensearch')
const AWS = require('aws-sdk')
const createAwsOpensearchConnector = require('aws-opensearch-connector')

// Create OpenSearch client with AWS IAM authentication using global AWS config
// The Lambda execution role will provide the necessary credentials
const client = new Client({
  ...createAwsOpensearchConnector(AWS.config),
  node: 'https://' + process.env.OPENSEARCH_ENDPOINT
})

module.exports = {
  client: client,
}
