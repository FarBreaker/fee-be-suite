# Attendee Update Functions Documentation

This document describes the two new functions for updating attendee information.

## Overview

Two new functions have been added to handle attendee updates:

1. **Update Attendee Details** - Updates attendee information while preserving the attendance status
2. **Update Attendee Status** - Updates only the attendance status to "VERIFIED"

Both functions require authentication and follow RESTful design principles.

## Function 1: Update Attendee Details

### Endpoint
```http
PUT /v1/events/{eventSlug}/attendees/{attendeeId}
```

### Description
Updates attendee details (name, phone, profession, etc.) while keeping the attendance status unchanged.

### Authentication
**Required** - Cognito JWT token

### Path Parameters
- `eventSlug` (string, required): The event identifier
- `attendeeId` (string, required): The attendee identifier (email)

### Request Body
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "profession": "Software Engineer"
}
```

### Allowed Fields for Update
- `firstName`
- `lastName`
- `phone`
- `profession`
- `eventType`
- Any other attendee fields except:
  - `attendanceStatus` (protected)
  - `pk` (protected)
  - `sk` (protected)

### Response Format
```json
{
  "status": "OK",
  "message": "Attendee details updated successfully",
  "updatedAttendee": {
    "eventSlug": "tech-summit-2024",
    "attendeeId": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "profession": "Software Engineer",
    "attendanceStatus": "PENDING",
    "updatedDate": "2024-01-15T10:30:00.000Z",
    "updatedBy": "admin"
  }
}
```

### Features
- **Status Preservation**: Attendance status remains unchanged
- **Audit Trail**: Automatically adds `updatedDate` and `updatedBy` fields
- **Validation**: Prevents updating protected fields
- **Existence Check**: Verifies attendee exists before updating

### Error Responses

#### 400 Bad Request
```json
{
  "status": "Error",
  "message": "No valid fields to update"
}
```

#### 404 Not Found
```json
{
  "status": "Error",
  "message": "Attendee not found"
}
```

## Function 2: Update Attendee Status

### Endpoint
```http
PATCH /v1/events/{eventSlug}/attendees/{attendeeId}/verify
```

### Description
Updates only the attendance status to "VERIFIED" and adds verification metadata.

### Authentication
**Required** - Cognito JWT token

### Path Parameters
- `eventSlug` (string, required): The event identifier
- `attendeeId` (string, required): The attendee identifier (email)

### Request Body
None required - the function automatically sets status to "VERIFIED"

### Response Format
```json
{
  "status": "OK",
  "message": "Attendee status updated to VERIFIED successfully",
  "updatedAttendee": {
    "eventSlug": "tech-summit-2024",
    "attendeeId": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "attendanceStatus": "VERIFIED",
    "verifiedDate": "2024-01-15T10:30:00.000Z",
    "verifiedBy": "admin"
  }
}
```

### Features
- **Single Purpose**: Only updates attendance status
- **Automatic Verification**: Sets status to "VERIFIED" without requiring it in request
- **Audit Trail**: Adds `verifiedDate` and `verifiedBy` fields
- **Existence Check**: Verifies attendee exists before updating

### Error Responses

#### 404 Not Found
```json
{
  "status": "Error",
  "message": "Attendee not found"
}
```

## Usage Examples

### Update Attendee Details
```javascript
const response = await fetch('/v1/events/tech-summit-2024/attendees/john@example.com', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + jwtToken
  },
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Smith',
    phone: '+1234567890',
    profession: 'Senior Software Engineer'
  })
});

const result = await response.json();
console.log(result.updatedAttendee);
```

### Verify Attendee
```javascript
const response = await fetch('/v1/events/tech-summit-2024/attendees/john@example.com/verify', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer ' + jwtToken
  }
});

const result = await response.json();
console.log(result.updatedAttendee.attendanceStatus); // "VERIFIED"
```

## Database Schema Impact

### New Fields Added
- `updatedDate`: ISO timestamp when details were last updated
- `updatedBy`: Username of who updated the details
- `verifiedDate`: ISO timestamp when status was verified
- `verifiedBy`: Username of who verified the attendee

### Existing Fields
- All existing attendee fields remain unchanged
- `attendanceStatus` can be "PENDING", "VERIFIED", or other values

## Security Considerations

### Authentication
- Both endpoints require valid Cognito JWT tokens
- User identity is captured in audit fields (`updatedBy`, `verifiedBy`)

### Authorization
- Functions use the authenticated user's username from JWT claims
- Falls back to "admin" if username is not available

### Data Protection
- Protected fields (`pk`, `sk`, `attendanceStatus`) cannot be updated via the details endpoint
- Status can only be updated through the dedicated verify endpoint

## Integration with Existing System

### Compatibility
- Functions work with existing attendee data structure
- No breaking changes to existing endpoints
- Follows established RESTful patterns

### Audit Trail
- All updates are tracked with timestamps and user information
- Maintains data integrity and accountability

### Error Handling
- Consistent error response format
- Proper HTTP status codes
- Detailed error messages for debugging

## Testing Checklist

### Update Attendee Details Function
- [ ] Test with valid attendee data
- [ ] Test with non-existent attendee
- [ ] Test with empty request body
- [ ] Test with protected fields in request
- [ ] Verify status is preserved
- [ ] Verify audit fields are added
- [ ] Test authentication requirement

### Update Attendee Status Function
- [ ] Test with valid attendee
- [ ] Test with non-existent attendee
- [ ] Verify status changes to VERIFIED
- [ ] Verify verification fields are added
- [ ] Test authentication requirement
- [ ] Test without request body

### Integration Tests
- [ ] Test both functions on same attendee
- [ ] Verify DynamoDB updates are correct
- [ ] Test with different user identities
- [ ] Verify error handling works correctly