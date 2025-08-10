export type AmplifyDependentResourcesAttributes = {
  "api": {
    "invite": {
      "ApiId": "string",
      "ApiName": "string",
      "RootUrl": "string"
    },
    "kiyanaw": {
      "GraphQLAPIEndpointOutput": "string",
      "GraphQLAPIIdOutput": "string"
    },
    "spellcheck": {
      "ApiId": "string",
      "ApiName": "string",
      "RootUrl": "string"
    }
  },
  "auth": {
    "kiyanaw4007d1974007d197": {
      "AppClientID": "string",
      "AppClientIDWeb": "string",
      "CreatedSNSRole": "string",
      "IdentityPoolId": "string",
      "IdentityPoolName": "string",
      "UserPoolArn": "string",
      "UserPoolId": "string",
      "UserPoolName": "string"
    }
  },
  "custom": {
    "inviteHandlerSES": {
      "SESEmailIdentityArn": "string",
      "SESFromEmailAddress": "string",
      "SESRoleArn": "string"
    },
    "regionChangeSQS": {
      "RegionChangeDeadLetterQueueUrl": "string",
      "RegionChangeQueueUrl": "string"
    },
    "statsOpenSearch": {
      "OpenSearchDomainArn": "string",
      "OpenSearchDomainEndpoint": "string",
      "OpenSearchDomainName": "string"
    }
  },
  "function": {
    "createPeaksFile": {
      "Arn": "string",
      "LambdaExecutionRole": "string",
      "LambdaExecutionRoleArn": "string",
      "Name": "string",
      "Region": "string"
    },
    "crkSpellCheck": {
      "Arn": "string",
      "LambdaExecutionRole": "string",
      "LambdaExecutionRoleArn": "string",
      "Name": "string",
      "Region": "string"
    },
    "enqueueRegionChange": {
      "Arn": "string",
      "LambdaExecutionRole": "string",
      "LambdaExecutionRoleArn": "string",
      "Name": "string",
      "Region": "string"
    },
    "indexRegionData": {
      "Arn": "string",
      "LambdaExecutionRole": "string",
      "LambdaExecutionRoleArn": "string",
      "Name": "string",
      "Region": "string"
    },
    "inviteHandler": {
      "Arn": "string",
      "LambdaExecutionRole": "string",
      "LambdaExecutionRoleArn": "string",
      "Name": "string",
      "Region": "string"
    },
    "kiyanawaudiowaveform": {
      "Arn": "string"
    },
    "kiyanawcrkFSTs": {
      "Arn": "string"
    },
    "kiyanawffmpeg": {
      "Arn": "string"
    },
    "kiyanawlibHfstol": {
      "Arn": "string"
    },
    "notifyRegionChanges": {
      "Arn": "string",
      "LambdaExecutionRole": "string",
      "LambdaExecutionRoleArn": "string",
      "Name": "string",
      "Region": "string"
    },
    "onTranscriptionChange": {
      "Arn": "string",
      "LambdaExecutionRole": "string",
      "LambdaExecutionRoleArn": "string",
      "Name": "string",
      "Region": "string"
    }
  },
  "hosting": {
    "S3AndCloudFront": {
      "CloudFrontDistributionID": "string",
      "CloudFrontDomainName": "string",
      "CloudFrontOriginAccessIdentity": "string",
      "CloudFrontSecureURL": "string",
      "HostingBucketName": "string",
      "Region": "string",
      "S3BucketSecureURL": "string",
      "WebsiteURL": "string"
    }
  },
  "storage": {
    "transcriptions": {
      "BucketName": "string",
      "Region": "string"
    }
  }
}