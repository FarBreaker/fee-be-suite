# Participant to Attendee Migration Summary

This document summarizes all the changes made to migrate from "participant" terminology to "attendee" terminology throughout the project.

## Files Renamed

1. `getEventParticipants.ts` → `getEventAttendees.ts`
2. `deleteParticipant.ts` → `deleteAttendee.ts`
3. `manualEventRegistration.ts` → `manualAttendeeRegistration.ts`

## API Endpoints Changed

| Old Endpoint | New Endpoint |
|-------------|-------------|
| `GET /v1/event-participants/{eventSlug}` | `GET /v1/event-attendees/{eventSlug}` |
| `POST /v1/manual-event-registration` | `POST /v1/manual-attendee-registration` |
| `DELETE /v1/event-participants/{eventSlug}` | `DELETE /v1/event-attendees/{eventSlug}` |

## Database Schema Changes

### DynamoDB Partition Key Changes
- `{eventSlug}#PARTICIPANT` → `{eventSlug}#ATTENDEE`

### Response Field Changes
- `participantCount` → `attendeeCount`
- `participants` → `attendees`
- `participantId` → `attendeeId`
- `deletedParticipant` → `deletedAttendee`

## Function Names Changed

### CDK Stack Functions
- `GetEventParticipantsFunction` → `GetEventAttendeesFunction`
- `ManualEventRegistrationFunction` → `ManualAttendeeRegistrationFunction`
- `DeleteParticipantFunction` → `DeleteAttendeeFunction`

### Lambda Function Definitions
- `getEventParticipants` → `getEventAttendees`
- `manualEventRegistration` → `manualAttendeeRegistration`
- `deleteParticipant` → `deleteAttendee`

## Code Changes Summary

### 1. getEventAttendees.ts (formerly getEventParticipants.ts)
- Changed DynamoDB query to use `#ATTENDEE` partition key
- Updated response to use `attendees` and `attendeeCount`
- Updated comments to reference attendees

### 2. deleteAttendee.ts (formerly deleteParticipant.ts)
- Changed DynamoDB operations to use `#ATTENDEE` partition key
- Updated error messages to reference attendees
- Updated response to use `deletedAttendee`

### 3. manualAttendeeRegistration.ts (formerly manualEventRegistration.ts)
- Changed DynamoDB item to use `#ATTENDEE` partition key
- Updated variable names from `participantItem` to `attendeeItem`
- Updated response to use `attendeeId`
- Updated comments to reference attendees

### 4. eventRegistration.ts
- Changed DynamoDB item to use `#ATTENDEE` partition key
- Updated variable names from `participantItem` to `attendeeItem`
- Updated response to use `attendeeId`
- Updated comments to reference attendees

### 5. stateless-stack.ts
- Updated all Lambda function definitions
- Updated API route paths
- Updated DynamoDB permissions
- Updated function references throughout

## Migration Impact

### ⚠️ Breaking Changes
- **API Endpoints**: All attendee-related endpoints have new paths
- **Database Schema**: DynamoDB partition keys have changed
- **Response Format**: JSON response fields have new names

### 🔄 Required Client Updates
1. Update API endpoint URLs
2. Update response field parsing
3. Update any hardcoded references to "participant"

### 📊 Data Migration
- Existing data with `#PARTICIPANT` keys will need to be migrated to `#ATTENDEE`
- Consider running a data migration script before deploying

## RESTful API Migration

### Additional Changes Made
- Implemented RESTful API design principles
- Updated all endpoints to follow REST conventions
- Changed HTTP methods to be semantically correct
- Implemented nested resources for better hierarchy

### New RESTful Endpoints
See `RESTFUL_API_DOCUMENTATION.md` for complete API reference.

## Deployment Checklist

- [ ] Update client applications to use new RESTful endpoint paths
- [ ] Update any documentation or API specs
- [ ] Plan data migration for existing records
- [ ] Update monitoring/alerting for new function names
- [ ] Test all attendee-related functionality
- [ ] Update any integration tests
- [ ] Update frontend applications to use new API structure
- [ ] Update mobile applications if any
- [ ] Notify API consumers about the breaking changes

## Rollback Plan

If rollback is needed:
1. Revert CDK stack changes (both attendee migration and RESTful changes)
2. Rename files back to original names
3. Restore original API endpoints and HTTP methods
4. Migrate data back to `#PARTICIPANT` keys
5. Restore original function parameter handling