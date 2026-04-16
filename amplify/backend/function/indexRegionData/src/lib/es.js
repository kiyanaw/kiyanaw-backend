const { Client } = require('@opensearch-project/opensearch')
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws-v3')
const { defaultProvider } = require('@aws-sdk/credential-provider-node')

const client = new Client({
  ...AwsSigv4Signer({
    region: process.env.REGION || process.env.AWS_REGION || 'us-east-1',
    service: 'es',
    getCredentials: () => defaultProvider()(),
  }),
  node: 'https://' + process.env.OPENSEARCH_ENDPOINT
})

module.exports = {
  client: client,
}
