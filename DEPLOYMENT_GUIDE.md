# Deployment Guide for DynamoDB Stream Handler

This guide explains how to deploy the updated stacks with the DynamoDB stream handler for attendee counter management.

## Deployment Order

Due to the cross-stack dependencies, you must deploy the stacks in the correct order:

### 1. Deploy Stateful Stack First
```bash
cdk deploy StatefulStack
```

**Why first?** The stateful stack creates:
- DynamoDB table with streams enabled
- Exports the table name and stream ARN
- S3 bucket and other persistent resources

### 2. Deploy Stateless Stack Second
```bash
cdk deploy StatelessStack
```

**Why second?** The stateless stack:
- Imports the table name and stream ARN from the stateful stack
- Creates the Lambda functions including the stream handler
- Configures the event source mapping using the imported stream ARN

## What Changed

### Stateful Stack Changes
- **DynamoDB Streams**: Enabled with `NEW_AND_OLD_IMAGES` view type
- **New Export**: Added `TableStreamArn` export for cross-stack reference
- **Stream Configuration**: Configured at table creation time

### Stateless Stack Changes
- **Stream Handler**: New `updateAttendeeCounter` Lambda function
- **Event Source Mapping**: Uses CloudFormation `CfnEventSourceMapping` with imported stream ARN
- **IAM Permissions**: Grants stream read permissions to the Lambda function
- **Cross-Stack Import**: Imports stream ARN using `Fn.importValue()`

## Validation Steps

After deployment, verify the setup:

### 1. Check DynamoDB Streams
```bash
aws dynamodb describe-table --table-name <your-table-name> --query 'Table.StreamSpecification'
```
Should return:
```json
{
    "StreamEnabled": true,
    "StreamViewType": "NEW_AND_OLD_IMAGES"
}
```

### 2. Check Lambda Event Source Mapping
```bash
aws lambda list-event-source-mappings --function-name <stream-handler-function-name>
```
Should show an active event source mapping with your DynamoDB stream ARN.

### 3. Check CloudWatch Logs
After creating/deleting attendees, check the stream handler logs:
```bash
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/updateAttendeeCounter"
```

## Testing the Stream Handler

### 1. Create an Attendee
```bash
curl -X POST https://your-api-gateway/v1/events/tech-summit-2024/attendees/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com","phone":"123-456-7890","profession":"Developer","eventType":"fad"}'
```

### 2. Check Stream Handler Logs
```bash
aws logs filter-log-events --log-group-name "/aws/lambda/updateAttendeeCounter" --start-time $(date -d '5 minutes ago' +%s)000
```

### 3. Verify Counter Update
Check that the event record now has an updated `attendeeCount` field.

## Troubleshooting

### Common Issues

#### 1. "Streams not enabled" Error
**Cause**: Trying to create event source mapping before streams are enabled
**Solution**: Ensure stateful stack is deployed first with streams enabled

#### 2. "Stream ARN not found" Error
**Cause**: Cross-stack export not available
**Solution**: 
- Verify stateful stack deployed successfully
- Check CloudFormation exports: `aws cloudformation list-exports`

#### 3. "Permission denied" Error
**Cause**: Lambda doesn't have stream read permissions
**Solution**: Check IAM role has these permissions:
- `dynamodb:DescribeStream`
- `dynamodb:GetRecords`
- `dynamodb:GetShardIterator`
- `dynamodb:ListStreams`

#### 4. Stream Handler Not Triggering
**Cause**: Event source mapping not active
**Solution**: 
- Check event source mapping status
- Verify stream ARN is correct
- Check Lambda function logs for errors

### Debugging Commands

```bash
# Check table stream status
aws dynamodb describe-table --table-name <table-name>

# List event source mappings
aws lambda list-event-source-mappings

# Check CloudFormation exports
aws cloudformation list-exports

# View Lambda function configuration
aws lambda get-function --function-name updateAttendeeCounter

# Check recent log events
aws logs filter-log-events --log-group-name "/aws/lambda/updateAttendeeCounter" --start-time $(date -d '1 hour ago' +%s)000
```

## Rollback Plan

If you need to rollback:

### 1. Remove Stream Handler
```bash
# Delete the event source mapping
aws lambda delete-event-source-mapping --uuid <mapping-uuid>

# Or redeploy stateless stack without stream handler
```

### 2. Disable Streams (Optional)
```bash
# Modify stateful stack to disable streams
# Redeploy stateful stack
cdk deploy StatefulStack
```

## Performance Considerations

### Stream Handler Performance
- **Memory**: 128MB (sufficient for counter updates)
- **Timeout**: 1 minute (allows for retries)
- **Batch Size**: 10 records (balances latency vs throughput)
- **Max Batching Window**: 5 seconds (reduces invocations)

### Cost Implications
- **DynamoDB Streams**: $0.02 per 100,000 read request units
- **Lambda Invocations**: Based on stream activity
- **CloudWatch Logs**: Standard logging charges

### Monitoring
- Set up CloudWatch alarms for Lambda errors
- Monitor stream handler duration and success rate
- Track attendee counter accuracy with periodic reconciliation

## Next Steps

After successful deployment:
1. Test attendee registration and deletion flows
2. Verify counter accuracy
3. Set up monitoring and alerting
4. Consider implementing counter reconciliation job
5. Add integration tests for stream processing