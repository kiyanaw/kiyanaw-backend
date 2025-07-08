# Region Change SQS Queue

This CDK stack creates an SQS queue system for handling region change events in the Kiyanaw backend.

## Components

### Queues
- **Main Queue**: `enqueueRegionChanges-{env}` - Receives region change messages
- **Dead Letter Queue**: `enqueueRegionChanges-dlq-{env}` - Stores failed messages after 3 retries

### Functions
- **enqueueRegionChange**: Sends messages to the queue when region changes are detected
- **indexRegionData**: Processes messages from the queue to update search indices

## Configuration

### Queue Settings
- **Visibility Timeout**: 5 minutes
- **Message Retention**: 4 days
- **Max Receive Count**: 3 (before moving to DLQ)
- **DLQ Retention**: 14 days

### Permissions
- **enqueueRegionChange**: `sqs:SendMessage` permission on the main queue
- **indexRegionData**: `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes` permissions on the main queue

### Event Source Mapping
- **indexRegionData** is triggered by messages in the main queue
- **Batch Size**: 1 message at a time
- **Batching Window**: 0 seconds (immediate processing)

## Deployment

The stack is deployed as part of the Amplify backend using:

```bash
amplify push
```

## Outputs

The stack provides the following CloudFormation outputs:
- `RegionChangeQueueUrl`: URL of the main queue
- `RegionChangeDeadLetterQueueUrl`: URL of the dead letter queue

## Monitoring

Monitor the queues in the AWS SQS console:
- Check message counts and age
- Monitor DLQ for failed messages
- Review CloudWatch logs for function execution 
