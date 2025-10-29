# API Migration Guide - Route Configuration Changes

This guide covers the migration from the previous API structure to the updated route configuration based on your CSV changes.

## Overview of Changes

The main changes involve:
1. **Parameter naming**: Changed from `eventId` to `eventSlug` in several endpoints
2. **Quiz resource restructuring**: Moved quiz endpoints from nested under events to standalone resource

## Detailed Changes

### 1. Event Details Endpoint
**Before:**
```http
GET /v1/events/{eventType}/{eventId}
```

**After:**
```http
GET /v1/events/{eventType}/{eventSlug}
```

**Impact:**
- Path parameter changed from `eventId` to `eventSlug`
- Function updated to handle `eventSlug` parameter
- Same functionality, different parameter name

### 2. Delete Event Endpoint
**Before:**
```http
DELETE /v1/events/{eventType}/{eventId}
```

**After:**
```http
DELETE /v1/events/{eventType}/{eventSlug}
```

**Impact:**
- Path parameter changed from `eventId` to `eventSlug`
- Function updated to handle `eventSlug` parameter
- Same functionality, different parameter name

### 3. Quiz Endpoints (Major Change)
**Before:**
```http
POST /v1/events/{eventId}/quiz
GET  /v1/events/{eventId}/quiz
```

**After:**
```http
POST /v1/quiz/{eventSlug}
GET  /v1/quiz/{eventSlug}
```

**Impact:**
- Quiz endpoints moved from nested under events to standalone resource
- Parameter changed from `eventId` to `eventSlug`
- Functions updated to get eventSlug from path parameter instead of request body
- Response structure updated to use `eventSlug` instead of `eventId`

## Migration Steps for Clients

### Step 1: Update Event Detail Calls
```javascript
// Before
const response = await fetch(`/v1/events/conference/tech-summit-2024-123`);

// After  
const response = await fetch(`/v1/events/conference/tech-summit-2024`);
```

### Step 2: Update Event Deletion Calls
```javascript
// Before
const response = await fetch(`/v1/events/conference/tech-summit-2024-123`, {
  method: 'DELETE'
});

// After
const response = await fetch(`/v1/events/conference/tech-summit-2024`, {
  method: 'DELETE'
});
```

### Step 3: Update Quiz Upload Calls
```javascript
// Before
const response = await fetch(`/v1/events/tech-summit-2024-123/quiz`, {
  method: 'POST',
  body: JSON.stringify({
    quiz: {
      eventId: 'tech-summit-2024-123',
      questions: [...]
    }
  })
});

// After
const response = await fetch(`/v1/quiz/tech-summit-2024`, {
  method: 'POST',
  body: JSON.stringify({
    quiz: {
      questions: [...]
    }
  })
});
```

### Step 4: Update Quiz Retrieval Calls
```javascript
// Before
const response = await fetch(`/v1/events/tech-summit-2024-123/quiz`);

// After
const response = await fetch(`/v1/quiz/tech-summit-2024`);
```

## Response Format Changes

### Quiz Upload Response
**Before:**
```json
{
  "status": "OK",
  "message": "Quiz uploaded successfully",
  "key": "tech-summit-2024-123/quiz.json",
  "eventId": "tech-summit-2024-123"
}
```

**After:**
```json
{
  "status": "OK",
  "message": "Quiz uploaded successfully",
  "key": "tech-summit-2024/quiz.json",
  "eventSlug": "tech-summit-2024"
}
```

## Database Impact

### No Database Schema Changes Required
- The changes are primarily in the API layer
- DynamoDB operations remain the same
- S3 key structure updated to use eventSlug instead of eventId

### S3 Storage Structure
**Before:**
```
bucket/
  tech-summit-2024-123/
    quiz.json
```

**After:**
```
bucket/
  tech-summit-2024/
    quiz.json
```

## Testing Checklist

### Event Endpoints
- [ ] Test event list with query parameter: `GET /events?type=conference`
- [ ] Test event details with eventSlug: `GET /events/conference/tech-summit-2024`
- [ ] Test event creation: `POST /events/conference`
- [ ] Test event deletion with eventSlug: `DELETE /events/conference/tech-summit-2024`

### Attendee Endpoints (No Changes)
- [ ] Test attendee list: `GET /events/tech-summit-2024/attendees`
- [ ] Test manual registration: `POST /events/tech-summit-2024/attendees`
- [ ] Test self-registration: `POST /events/tech-summit-2024/attendees/register`
- [ ] Test attendee deletion: `DELETE /events/tech-summit-2024/attendees/john@example.com`

### File Endpoints (No Changes)
- [ ] Test file upload: `POST /files`
- [ ] Test file listing: `GET /files`

### Quiz Endpoints (Major Changes)
- [ ] Test quiz upload: `POST /quiz/tech-summit-2024`
- [ ] Test quiz retrieval: `GET /quiz/tech-summit-2024`
- [ ] Verify S3 key structure uses eventSlug
- [ ] Verify response format uses eventSlug

## Rollback Plan

If issues arise, you can rollback by:

1. **Revert CDK Stack Changes:**
   ```bash
   git checkout HEAD~1 -- stateless/stateless-stack.ts
   ```

2. **Revert Function Changes:**
   ```bash
   git checkout HEAD~1 -- stateless/functions/getEventDetailsOptimized.ts
   git checkout HEAD~1 -- stateless/functions/deleteEvents.ts
   git checkout HEAD~1 -- stateless/functions/uploadQuizToS3.ts
   git checkout HEAD~1 -- stateless/functions/getQuizFromS3.ts
   git checkout HEAD~1 -- stateless/functions/functionTypes.ts
   ```

3. **Redeploy:**
   ```bash
   npm run deploy
   ```

## Deployment Strategy

### Option 1: Blue-Green Deployment (Recommended)
1. Deploy new API version alongside existing one
2. Update clients gradually
3. Monitor for issues
4. Switch traffic completely once validated
5. Decommission old version

### Option 2: Direct Migration
1. Deploy changes during maintenance window
2. Update all clients simultaneously
3. Monitor for issues
4. Rollback if necessary

## Monitoring and Validation

### Key Metrics to Monitor
- API Gateway error rates
- Lambda function error rates
- S3 operation success rates
- Client application error logs

### Validation Steps
1. Verify all endpoints respond correctly
2. Check S3 objects are created with correct keys
3. Validate response formats match expectations
4. Confirm authentication still works properly

## Communication Plan

### Internal Teams
- [ ] Notify backend developers of function changes
- [ ] Update API documentation
- [ ] Inform QA team of testing requirements
- [ ] Alert DevOps team of deployment changes

### External Clients (if applicable)
- [ ] Send migration notice with timeline
- [ ] Provide updated API documentation
- [ ] Offer support during migration period
- [ ] Set deprecation timeline for old endpoints

## Timeline

| Phase | Duration | Activities |
|-------|----------|------------|
| Preparation | 1-2 days | Code changes, testing, documentation |
| Deployment | 1 day | Deploy to staging, validate, deploy to production |
| Migration | 1-2 weeks | Client updates, monitoring, support |
| Cleanup | 1 day | Remove old code, update documentation |

## Support and Troubleshooting

### Common Issues
1. **404 Errors**: Check if eventSlug parameter is correctly formatted
2. **Quiz Upload Failures**: Verify request body no longer includes eventId
3. **S3 Key Errors**: Confirm S3 operations use eventSlug in key generation

### Contact Information
- Backend Team: [team-email]
- DevOps Team: [devops-email]
- API Documentation: [docs-url]

---

**Note**: This migration involves breaking changes. Ensure all client applications are updated before deploying to production.