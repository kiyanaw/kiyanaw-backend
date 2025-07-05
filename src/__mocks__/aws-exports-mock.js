const awsmobile = {
  aws_project_region: 'us-east-1',
  aws_user_files_s3_bucket: 'test-bucket',
  aws_user_files_s3_bucket_region: 'us-east-1',
  aws_content_delivery_url: 'https://test-cdn.com',
  aws_content_delivery_bucket: 'test-cdn-bucket',
  aws_appsync_graphqlEndpoint: 'https://test-appsync.amazonaws.com/graphql',
  aws_appsync_region: 'us-east-1',
  aws_appsync_authenticationType: 'API_KEY',
  aws_user_pools_id: 'us-east-1_test123',
  aws_user_pools_web_client_id: 'test-client-id',
  aws_cognito_identity_pool_id: 'us-east-1:test-identity-pool-id',
  aws_cognito_region: 'us-east-1',
  aws_cloud_logic_custom: [],
  aws_cognito_password_protection_settings: {
    passwordPolicyMinLength: 8,
    passwordPolicyCharacters: []
  },
  aws_cognito_mfa_configuration: 'OFF',
  aws_cognito_mfa_types: [],
  aws_cognito_verification_mechanisms: [],
  aws_cognito_signup_attributes: [],
  aws_cognito_username_attributes: [],
  aws_cognito_social_providers: []
};

export default awsmobile; 