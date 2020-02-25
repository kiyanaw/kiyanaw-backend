// import gql from 'graphql-tag'
import AWSAppSyncClient from 'aws-appsync'
import { Auth } from 'aws-amplify'
import awsconfig from '../aws-exports'

let client

export default {
  getClient() {
    if (!client) {
      client = new AWSAppSyncClient({
        url: awsconfig.aws_appsync_graphqlEndpoint,
        region: awsconfig.aws_appsync_region,
        auth: {
          type: awsconfig.aws_appsync_authenticationType,
          credentials: () => Auth.currentCredentials()
        },
        disableOffline: true
      })
    }
    return client
  }
}
