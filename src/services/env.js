import awsExports from '../aws-exports'

const REGEX = /.*-(\w+)/
const env = awsExports.aws_content_delivery_bucket.match(REGEX)[1]

export default {
  getEnvironmentName() {
    return env
  },
  getRegion() {
    return awsExports.aws_content_delivery_bucket_region
  },
  getUserBucket () {
    return awsExports.aws_user_files_s3_bucket
  }
}
