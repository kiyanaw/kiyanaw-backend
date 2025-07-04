import awsmobile from '../aws-exports.js';

/**
 * AWS Configuration Service
 * 
 * Provides clean access to AWS configuration values from aws-exports.js
 * following clean architecture principles.
 */
class AwsConfigService {
  /**
   * Get the AWS project region
   */
  getRegion(): string {
    return awsmobile.aws_project_region || '';
  }

  /**
   * Get the S3 bucket name for user files
   */
  getUserFilesBucket(): string {
    return awsmobile.aws_user_files_s3_bucket || '';
  }

  /**
   * Get the S3 bucket region for user files
   */
  getUserFilesBucketRegion(): string {
    return awsmobile.aws_user_files_s3_bucket_region || '';
  }

  /**
   * Get the CloudFront distribution URL
   */
  getContentDeliveryUrl(): string {
    return awsmobile.aws_content_delivery_url || '';
  }

  /**
   * Get the CloudFront distribution bucket
   */
  getContentDeliveryBucket(): string {
    return awsmobile.aws_content_delivery_bucket || '';
  }

  /**
   * Get the AppSync GraphQL endpoint
   */
  getGraphQLEndpoint(): string {
    return awsmobile.aws_appsync_graphqlEndpoint || '';
  }

  /**
   * Get the AppSync region
   */
  getAppSyncRegion(): string {
    return awsmobile.aws_appsync_region || '';
  }

  /**
   * Get the AppSync authentication type
   */
  getAppSyncAuthType(): string {
    return awsmobile.aws_appsync_authenticationType || '';
  }

  /**
   * Get Cognito User Pool ID
   */
  getUserPoolId(): string {
    return awsmobile.aws_user_pools_id || '';
  }

  /**
   * Get Cognito User Pool Web Client ID
   */
  getUserPoolWebClientId(): string {
    return awsmobile.aws_user_pools_web_client_id || '';
  }

  /**
   * Get Cognito Identity Pool ID
   */
  getIdentityPoolId(): string {
    return awsmobile.aws_cognito_identity_pool_id || '';
  }

  /**
   * Get Cognito region
   */
  getCognitoRegion(): string {
    return awsmobile.aws_cognito_region || '';
  }

  /**
   * Get custom API endpoint by name
   */
  getCustomApiEndpoint(apiName: string): string | undefined {
    const api = awsmobile.aws_cloud_logic_custom?.find((api: any) => api.name === apiName);
    return api?.endpoint;
  }

  /**
   * Get all custom API configurations
   */
  getCustomApis(): Array<{ name: string; endpoint: string; region: string }> {
    return awsmobile.aws_cloud_logic_custom || [];
  }

  /**
   * Get password protection settings
   */
  getPasswordPolicy(): {
    minLength: number;
    characters: string[];
  } {
    const settings = awsmobile.aws_cognito_password_protection_settings;
    return {
      minLength: settings?.passwordPolicyMinLength || 8,
      characters: settings?.passwordPolicyCharacters || []
    };
  }

  /**
   * Get MFA configuration
   */
  getMfaConfig(): {
    configuration: string;
    types: string[];
  } {
    return {
      configuration: awsmobile.aws_cognito_mfa_configuration || '',
      types: awsmobile.aws_cognito_mfa_types || []
    };
  }

  /**
   * Get verification mechanisms
   */
  getVerificationMechanisms(): string[] {
    return awsmobile.aws_cognito_verification_mechanisms || [];
  }

  /**
   * Get signup attributes
   */
  getSignupAttributes(): string[] {
    return awsmobile.aws_cognito_signup_attributes || [];
  }

  /**
   * Get username attributes
   */
  getUsernameAttributes(): string[] {
    return awsmobile.aws_cognito_username_attributes || [];
  }

  /**
   * Get social providers
   */
  getSocialProviders(): string[] {
    return awsmobile.aws_cognito_social_providers || [];
  }

  /**
   * Get the raw AWS mobile configuration (for edge cases)
   * Use sparingly - prefer specific getters above
   */
  getRawConfig(): typeof awsmobile {
    return awsmobile;
  }
}

// Export singleton instance
export const awsConfigService = new AwsConfigService();
export type { AwsConfigService }; 