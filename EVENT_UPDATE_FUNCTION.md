# Event Update Function Documentation

This document describes the new function for updating event information.

## Overview

A new function has been added to handle event updates:

**Update Event** - Updates event information while maintaining data integrity and providing an audit trail.

The function requires authentication and follows RESTful design principles.

## Function: Update Event

### Endpoint
```http
PUT /v1/events/{eventType}/{eventSlug}
```

### Description
Updates event details (title, description, date, location, etc.) while protecting critical system fields.

### Authentication
**Required** - Cognito JWT token

### Path Parameters
- `eventType` (string, required): The event type ("fad" or "event")
- `eventSlug` (string, required): The event identifier/slug

### Request Body
```json
{
  "title": "Updated Tech Summit 2024",
  "description": "An updated description of the tech summit",
  "date": "2024-06-15T09:00:00.000Z",
  "location": "New Convention Center",
  "maxAttendees": 500,
  "price": 150.00,
  "status": "ACTIVE"
}
```

### Allowed Fields for Update
- `title`
- `description`
- `date`
- `location`
- `maxAttendees`
- `price`
- `status`
- `slug` (event slug/identifier)
- `creationDate`
- Any other event fields except:
  - `pk` (protected - partition key)
  - `sk` (protected - sort key)
  - `eventType` (protected - should not change via update)

### Response Format
```json
{
  "status": "OK",
  "message": "Event updated successfully",
  "updatedEvent": {
    "eventType": "EVENT",
    "eventSlug": "tech-summit-2024",
    "title": "Updated Tech Summit 2024",
    "description": "An updated description of the tech summit",
    "date": "2024-06-15T09:00:00.000Z",
    "location": "New Convention Center",
    "maxAttendees": 500,
    "price": 150.00,
    "status": "ACTIVE",
    "updatedDate": "2024-01-15T10:30:00.000Z",
    "updatedBy": "admin"
  }
}
```

### Features
- **Field Protection**: Prevents updating critical system fields (`pk`, `sk`, `eventType`)
- **Audit Trail**: Automatically adds `updatedDate` and `updatedBy` fields
- **Validation**: 
  - Verifies event exists before updating
  - Validates eventType parameter (must be "fad" or "event")
  - Prevents updating with empty data
- **Case Handling**: Converts eventType to uppercase for database consistency

### Error Responses

#### 400 Bad Request - Missing Parameters
```json
{
  "status": "Error",
  "message": "Missing eventType path parameter"
}
```

#### 400 Bad Request - Invalid Event Type
```json
{
  "status": "Error",
  "message": "Invalid eventType parameter. Must be 'fad' or 'event'"
}
```

#### 400 Bad Request - No Valid Fields
```json
{
  "status": "Error",
  "message": "No valid fields to update"
}
```

#### 400 Bad Request - Invalid JSON
```json
{
  "status": "Error",
  "message": "Invalid JSON format"
}
```

#### 404 Not Found
```json
{
  "status": "Error",
  "message": "Event not found"
}
```

#### 500 Internal Server Error
```json
{
  "status": "Error",
  "message": "Internal server error"
}
```

## Usage Examples

### Update Event Details
```javascript
const response = await fetch('/v1/events/event/tech-summit-2024', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + jwtToken
  },
  body: JSON.stringify({
    title: 'Updated Tech Summit 2024',
    description: 'An amazing tech conference with updated agenda',
    date: '2024-06-15T09:00:00.000Z',
    location: 'New Convention Center',
    maxAttendees: 500,
    price: 150.00,
    status: 'ACTIVE'
  })
});

const result = await response.json();
console.log(result.updatedEvent);
```

### Update Single Field
```javascript
const response = await fetch('/v1/events/fad/design-workshop-2024', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + jwtToken
  },
  body: JSON.stringify({
    maxAttendees: 100
  })
});

const result = await response.json();
console.log(result.updatedEvent.maxAttendees); // 100
```

## Database Schema Impact

### New Fields Added
- `updatedDate`: ISO timestamp when event was last updated
- `updatedBy`: Username of who updated the event

### Existing Fields
- All existing event fields remain unchanged
- Protected fields cannot be modified through this endpoint

### Database Operations
- **Read**: Queries existing event using `begins_with` on sort key to verify it exists
- **Write**: Updates event with new data and audit fields using the actual sort key
- **Partition Key Mapping**: Converts eventType to uppercase (FAD/EVENT)
- **Sort Key Handling**: Uses `begins_with` query to find events that start with the provided eventSlug

## Security Considerations

### Authentication
- Endpoint requires valid Cognito JWT tokens
- User identity is captured in audit fields (`updatedBy`)

### Authorization
- Function uses the authenticated user's username from JWT claims
- Falls back to "admin" if username is not available

### Data Protection
- Protected fields (`pk`, `sk`, `eventType`) cannot be updated
- Prevents accidental corruption of database keys
- Maintains referential integrity

## Integration with Existing System

### Compatibility
- Works with existing event data structure
- No breaking changes to existing endpoints
- Follows established RESTful patterns
- Consistent with attendee update functions

### Audit Trail
- All updates are tracked with timestamps and user information
- Maintains data integrity and accountability
- Enables tracking of event changes over time

### Error Handling
- Consistent error response format with other functions
- Proper HTTP status codes
- Detailed error messages for debugging

## API Design Consistency

### RESTful Principles
- Uses PUT method for complete resource updates
- Resource identified by path parameters
- Consistent URL structure with other endpoints

### Response Format
- Matches pattern used by attendee update functions
- Consistent status and message fields
- Structured error responses

## Testing Checklist

### Basic Functionality
- [ ] Test with valid event data
- [ ] Test with non-existent event
- [ ] Test with empty request body
- [ ] Test with protected fields in request
- [ ] Verify audit fields are added
- [ ] Test authentication requirement

### Event Type Validation
- [ ] Test with eventType "fad"
- [ ] Test with eventType "event"
- [ ] Test with invalid eventType
- [ ] Test with missing eventType

### Field Updates
- [ ] Test updating single field
- [ ] Test updating multiple fields
- [ ] Test with invalid field values
- [ ] Verify protected fields are ignored

### Error Handling
- [ ] Test with malformed JSON
- [ ] Test with missing path parameters
- [ ] Test with non-existent event
- [ ] Verify proper HTTP status codes

### Integration Tests
- [ ] Test with different user identities
- [ ] Verify DynamoDB updates are correct
- [ ] Test audit trail functionality
- [ ] Verify error handling works correctly

## Performance Considerations

### Database Operations
- Single read operation to verify existence
- Single write operation to update event
- Efficient use of DynamoDB operations

### Function Configuration
- Uses PERFORMANCE profile for optimal execution
- 3-minute timeout for complex operations
- Minimal memory footprint

## Monitoring and Observability

### CloudWatch Metrics
- Function duration and error rates
- DynamoDB read/write metrics
- API Gateway request metrics

### Logging
- Comprehensive error logging
- Request/response logging for debugging
- Audit trail in database for compliance