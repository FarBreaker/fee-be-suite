# DynamoDB Stream Handler for Attendee Counter

This document describes the DynamoDB stream handler that automatically maintains attendee counts for events.

## Overview

The `updateAttendeeCounter` Lambda function is triggered by DynamoDB streams whenever attendee records are added, modified, or removed. It automatically updates the `attendeeCount` field on the corresponding event record.

## How It Works

### Stream Configuration
- **Stream View Type**: `NEW_AND_OLD_IMAGES` - Captures both the new and old item images
- **Batch Size**: 10 records per batch
- **Max Batching Window**: 5 seconds
- **Retry Attempts**: 3 attempts for failed records
- **Starting Position**: `LATEST` - Only processes new changes

### Event Processing

#### 1. INSERT Events (New Attendee)
- Triggered when: A new attendee registers for an event
- Action: Increments the `attendeeCount` by 1
- DynamoDB Operation: `ADD attendeeCount :inc` where `:inc = 1`

#### 2. REMOVE Events (Attendee Deleted)
- Triggered when: An attendee is removed from an event
- Action: Decrements the `attendeeCount` by 1
- Safety: Ensures count never goes below 0
- DynamoDB Operation: `ADD attendeeCount :dec` where `:dec = -1`

#### 3. MODIFY Events (Attendee Updated)
- Triggered when: An existing attendee record is modified
- Action: No counter change (attendee still exists)
- Behavior: Logs the event but takes no action

### Record Identification

The function identifies attendee records by checking if the partition key (`pk`) contains `#ATTENDEE`:
```
Format: {eventSlug}#ATTENDEE
Example: tech-summit-2024#ATTENDEE
```

### Event Lookup Strategy

Since the stream only provides the `eventSlug` from the attendee record, the function needs to find the corresponding event record to update its counter. It uses the following strategy:

1. **Extract eventSlug**: From the partition key `{eventSlug}#ATTENDEE`
2. **Search event partitions**: Tries both "FAD" and "EVENT" partition keys
3. **Query with begins_with**: Uses DynamoDB Query with `begins_with(sk, eventSlug)` to handle composite sort keys
4. **Return exact sort key**: Returns the complete composite sort key found (e.g., `eventSlug#2024-10-27#additionalData`)
5. **Graceful failure**: If event not found, logs warning but doesn't fail

## Error Handling

### Conditional Check Failures
- **Scenario**: Trying to decrement below 0 or counter doesn't exist
- **Action**: Resets counter to 0 and logs the correction
- **Prevents**: Negative attendee counts

### Event Not Found
- **Scenario**: Cannot locate the event record for the attendee
- **Action**: Logs warning and skips counter update
- **Impact**: Counter may become inconsistent but system continues

### Stream Processing Failures
- **Retry Logic**: Automatic retries up to 3 times
- **Dead Letter Queue**: Consider adding DLQ for persistent failures
- **Monitoring**: CloudWatch logs capture all errors

## Benefits

### 1. Automatic Consistency
- No manual counter management required
- Real-time updates as attendees are added/removed
- Eliminates race conditions in counter updates

### 2. Event-Driven Architecture
- Decoupled from main application logic
- Scales automatically with DynamoDB throughput
- No impact on API response times

### 3. Reliability
- Built-in retry mechanisms
- Graceful error handling
- Maintains data integrity

## Monitoring

### CloudWatch Metrics
- **Lambda Duration**: Monitor execution time
- **Lambda Errors**: Track processing failures
- **DynamoDB Stream Records**: Monitor stream throughput
- **Dead Letter Queue**: Track persistent failures (if configured)

### CloudWatch Logs
- Stream event details
- Counter update operations
- Error messages and warnings
- Event lookup attempts

### Custom Metrics (Recommended)
- Counter increment/decrement operations
- Event lookup success/failure rates
- Processing latency per record type

## Deployment Considerations

### DynamoDB Streams
- **Requirement**: Streams must be enabled on the table
- **Configuration**: `NEW_AND_OLD_IMAGES` view type
- **Cost**: Additional charges for stream reads

### Lambda Configuration
- **Memory**: 128MB (sufficient for simple operations)
- **Timeout**: 1 minute (allows for retries)
- **Concurrency**: Managed by DynamoDB stream shards
- **Permissions**: Read/Write access to DynamoDB table

### Performance
- **Latency**: Near real-time (typically < 1 second)
- **Throughput**: Scales with DynamoDB stream capacity
- **Batch Processing**: Processes up to 10 records per invocation

## Future Enhancements

### 1. Global Secondary Index (GSI)
- Add GSI on `eventSlug` for faster event lookups
- Eliminates need to search through "FAD" and "EVENT" partitions
- Improves performance and reliability for composite sort key lookups

### 2. Dead Letter Queue (DLQ)
- Handle persistent processing failures
- Manual intervention for problematic records
- Better error tracking and alerting

### 3. Counter Reconciliation
- Periodic job to verify counter accuracy
- Compare actual attendee count vs stored counter
- Automatic correction of discrepancies

### 4. Enhanced Monitoring
- Custom CloudWatch metrics
- Alerting on processing failures
- Dashboard for stream health monitoring

## Testing

### Unit Tests
- Mock DynamoDB stream events
- Test increment/decrement logic
- Verify error handling scenarios

### Integration Tests
- End-to-end attendee registration flow
- Verify counter updates in real-time
- Test failure scenarios and recovery

### Load Testing
- High-volume attendee operations
- Stream processing under load
- Performance and reliability validation

## Troubleshooting

### Common Issues

1. **Counter Not Updating**
   - Check if streams are enabled on table
   - Verify Lambda function permissions
   - Check CloudWatch logs for errors

2. **Negative Counter Values**
   - Function should prevent this automatically
   - Check for race conditions in deletion logic
   - Review error logs for conditional check failures

3. **Event Not Found Warnings**
   - Verify events are stored with "FAD" or "EVENT" partition keys
   - Consider implementing GSI for lookups
   - Verify event record format consistency

4. **High Lambda Costs**
   - Review batch size configuration
   - Optimize function memory allocation
   - Consider filtering stream events if needed