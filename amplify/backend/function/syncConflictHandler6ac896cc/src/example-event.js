const event = {
  newItem: {
    _lastChangedAt: 1677798957179,
    dateLastUpdated: '1677798956985',
    __typename: 'Region',
    transcriptionId: '8ce52730',
    start: 12.266924288564528,
    issues:
      '[{"id":"issue-needs-help-1676689358906","type":"needs-help","createdAt":1676689357795,"index":64,"text":"some","comments":[],"owner":"aaronfay"}]',
    userLastUpdated: 'otheruser',
    createdAt: '2023-02-13T23:14:31.314Z',
    translation: ' ants like peanut butter and jam \n',
    isNote: false,
    end: 17.500367531240155,
    text: '[{"insert":"asdfads aasasdfadfdfads \\n"}]',
    id: 'wavesurfer_anvr2984cs',
    _version: 341,
    updatedAt: '2023-03-02T23:15:57.301Z',
  },
  existingItem: {
    _lastChangedAt: 1677798957179,
    dateLastUpdated: '1677798956201',
    __typename: 'Region',
    transcriptionId: '8ce52730',
    start: 12.266924288564528,
    issues:
      '[{"id":"issue-needs-help-1676689358906","type":"needs-help","createdAt":1676689357795,"index":64,"text":"some","comments":[],"owner":"aaronfay"}]',
    userLastUpdated: 'testuser',
    createdAt: '2023-02-13T23:14:31.314Z',
    translation: ' ants like peanut butter and jam \n',
    isNote: false,
    end: 17.500367531240155,
    text: '[{"insert":"asdfads aasdsfasdfdfdfads \\n"}]',
    id: 'wavesurfer_anvr2984cs',
    _version: 341,
    updatedAt: '2023-03-02T23:15:57.130Z',
  },
  arguments: {
    input: {
      id: 'wavesurfer_anvr2984cs',
      text: '[{"insert":"asdfads aasasdfadfdfads \\n"}]',
      dateLastUpdated: '1677798956985',
      _version: 340,
    },
    condition: null,
  },
  identity: {
    accountId: 'testing',
    cognitoIdentityAuthProvider:
      '"cognito-idp.us-east-1.amazonaws.com/us-east-1_Gdjv5YZqO","cognito-idp.us-east-1.amazonaws.com/us-east-1_Gdjv5YZqO:CognitoSignIn:c2aad497-a3d8-4681-99b1-5fad788aaf49"',
    cognitoIdentityAuthType: 'authenticated',
    cognitoIdentityId: 'us-east-1:51376d18-5f99-425e-9c60-19ee6b671203',
    cognitoIdentityPoolId: 'us-east-1:f6439722-e449-4422-9057-242d86a66ee0',
    sourceIp: ['154.20.52.63'],
    userArn:
      'arn:aws:sts::494185203413:assumed-role/amplify-kiyanaw-dev-02717-authRole/CognitoIdentityCredentials',
    username: 'AROAXGD53Y3KQYBV7XD7H:CognitoIdentityCredentials',
  },
  resolver: {
    tableName: 'Region-medz76pob5eo3mfnkp6t43wy5a-dev',
    awsRegion: 'us-east-1',
    parentType: 'Mutation',
    field: 'updateRegion',
  },
}

module.exports = event