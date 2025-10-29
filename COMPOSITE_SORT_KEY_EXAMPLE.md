# Composite Sort Key Handling in Stream Handler

This document explains how the updated stream handler correctly handles composite sort keys in DynamoDB.

## Problem

The original implementation assumed that the sort key (sk) was exactly the `eventSlug`, but in reality, the sort key is composite and contains additional data.

### Example Data Structure

```
Event Records:
pk: "FAD"
sk: "tech-summit-2024#2024-10-27#conference"

pk: "EVENT" 
sk: "workshop-ai#2024-11-15#workshop"

Attendee Records:
pk: "tech-summit-2024#ATTENDEE"
sk: "john@example.com"

pk: "workshop-ai#ATTENDEE"
sk: "jane@example.com"
```

## Solution

The updated `findEventRecord` function now uses DynamoDB Query with `begins_with` to handle composite sort keys properly.

### Before (Incorrect)
```typescript
// This would fail because it looks for exact match
const result = await ddbDocClient.send(
  new GetCommand({
    TableName,
    Key: {
      pk: "FAD",
      sk: "tech-summit-2024", // Exact match - would not find the record
    },
  }),
);
```

### After (Correct)
```typescript
// This works because it uses begins_with for composite keys
const result = await ddbDocClient.send(
  new QueryCommand({
    TableName,
    KeyConditionExpression: "pk = :pk AND begins_with(sk, :eventSlug)",
    ExpressionAttributeValues: {
      ":pk": "FAD",
      ":eventSlug": "tech-summit-2024", // Finds "tech-summit-2024#2024-10-27#conference"
    },
    Limit: 1,
  }),
);
```

## Flow Example

### 1. Attendee Registration
```
Stream Event: INSERT
Record: pk="tech-summit-2024#ATTENDEE", sk="john@example.com"
```

### 2. Extract Event Slug
```typescript
const eventSlug = "tech-summit-2024"; // Extracted from "tech-summit-2024#ATTENDEE"
```

### 3. Find Event Record
```typescript
// Query FAD partition
Query: pk="FAD" AND begins_with(sk, "tech-summit-2024")
Result: pk="FAD", sk="tech-summit-2024#2024-10-27#conference"
```

### 4. Update Counter
```typescript
// Update using the complete composite sort key
UpdateCommand({
  Key: {
    pk: "FAD",
    sk: "tech-summit-2024#2024-10-27#conference" // Complete composite key
  },
  UpdateExpression: "ADD attendeeCount :inc",
  ExpressionAttributeValues: { ":inc": 1 }
})
```

## Benefits

### 1. Handles Any Sort Key Format
- Works with simple keys: `eventSlug`
- Works with composite keys: `eventSlug#date#type`
- Works with complex keys: `eventSlug#timestamp#location#category`

### 2. Efficient Lookup
- Single query operation instead of multiple GetItem attempts
- Uses DynamoDB's native `begins_with` function
- Limits results to 1 for efficiency

### 3. Robust Error Handling
- Logs the exact sort key found for debugging
- Gracefully handles cases where no event is found
- Continues processing other stream records even if one fails

## Testing

### Test Data Setup
```typescript
// Create test event with composite sort key
await ddbDocClient.send(new PutCommand({
  TableName: "TestTable",
  Item: {
    pk: "FAD",
    sk: "test-event#2024-10-27#conference",
    eventName: "Test Conference",
    attendeeCount: 0
  }
}));

// Create test attendee
await ddbDocClient.send(new PutCommand({
  TableName: "TestTable", 
  Item: {
    pk: "test-event#ATTENDEE",
    sk: "test@example.com",
    firstName: "Test",
    lastName: "User"
  }
}));
```

### Expected Stream Processing
```
1. Stream receives INSERT for attendee
2. Extracts eventSlug: "test-event"
3. Queries FAD partition with begins_with("test-event")
4. Finds: sk="test-event#2024-10-27#conference"
5. Updates attendeeCount on that exact record
6. Logs: "Incremented attendee count for event: test-event"
```

## Monitoring

### CloudWatch Logs to Watch For
```
✅ Good: "Found event record: pk=FAD, sk=test-event#2024-10-27#conference for eventSlug=test-event"
✅ Good: "Incremented attendee count for event: test-event"

❌ Bad: "Could not find event record for eventSlug: test-event in FAD or EVENT partitions"
❌ Bad: "Error incrementing attendee count for test-event"
```

### Debugging Queries
```bash
# Check if event exists with composite key
aws dynamodb query \
  --table-name YourTableName \
  --key-condition-expression "pk = :pk AND begins_with(sk, :eventSlug)" \
  --expression-attribute-values '{
    ":pk": {"S": "FAD"},
    ":eventSlug": {"S": "your-event-slug"}
  }'
```

This update ensures the stream handler works correctly with any sort key format, making it robust and future-proof for different event naming conventions.