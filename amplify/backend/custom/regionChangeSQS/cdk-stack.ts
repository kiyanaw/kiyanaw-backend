import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class cdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    /* Do not remove - Amplify CLI automatically injects the current deployment environment in this input parameter */
    const env = new cdk.CfnParameter(this, 'env', {
      type: 'String',
      description: 'Current Amplify CLI env name',
    });

    // Parameters that Amplify CLI injects based on dependencies
    const functionindexRegionDataName = new cdk.CfnParameter(this, 'functionindexRegionDataName', {
      type: 'String',
      description: 'Name of the indexRegionData function',
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const apikiyanawGraphQLAPIIdOutput = new cdk.CfnParameter(this, 'apikiyanawGraphQLAPIIdOutput', {
      type: 'String',
      description: 'GraphQL API ID for kiyanaw',
    });

    // Create dead letter queue
    const deadLetterQueue = new sqs.Queue(this, 'RegionChangeDeadLetterQueue', {
      queueName: `enqueueRegionChanges-dlq-${env.valueAsString}`,
      retentionPeriod: cdk.Duration.days(14),
    });

    // Create main queue with dead letter queue
    const regionChangeQueue = new sqs.Queue(this, 'RegionChangeQueue', {
      queueName: `enqueueRegionChanges-${env.valueAsString}`,
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3,
      },
      visibilityTimeout: cdk.Duration.minutes(5),
      retentionPeriod: cdk.Duration.days(4),
    });

    // Create event source mapping for indexRegionData function
    const eventSourceMapping = new lambda.CfnEventSourceMapping(this, 'RegionChangeEventSourceMapping', {
      functionName: functionindexRegionDataName.valueAsString,
      eventSourceArn: regionChangeQueue.queueArn,
      batchSize: 1,
      maximumBatchingWindowInSeconds: 0,
    });

    // The event source mapping depends on the queue
    eventSourceMapping.node.addDependency(regionChangeQueue);

    // Output the queue URL for reference
    new cdk.CfnOutput(this, 'RegionChangeQueueUrl', {
      value: regionChangeQueue.queueUrl,
      description: 'URL of the region change queue',
      exportName: `region-change-queue-url-${env.valueAsString}`,
    });

    new cdk.CfnOutput(this, 'RegionChangeDeadLetterQueueUrl', {
      value: deadLetterQueue.queueUrl,
      description: 'URL of the region change dead letter queue',
      exportName: `region-change-dlq-url-${env.valueAsString}`,
    });
  }
}
