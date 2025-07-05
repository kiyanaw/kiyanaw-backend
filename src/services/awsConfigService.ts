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