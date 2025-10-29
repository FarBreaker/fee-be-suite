# RESTful API Documentation

This document describes the new RESTful API design implemented for the event management system.

## API Base URL
```
https://your-api-gateway-url/v1
```

## Resources Overview

### 1. Events Resource

#### List Events
```http
GET /events?type={eventType}
```
- **Description**: Retrieve all events of a specific type
- **Query Parameters**: 
  - `type` (required): Event type ("fad" or "event")
- **Example**: `GET /events?type=fad`

#### Get Event Details
```http
GET /events/{eventType}/{eventId}
```
- **Description**: Retrieve details for a specific event
- **Path Parameters**:
  - `eventType`: Type of event ("fad" or "event")
  - `eventId`: Unique event identifier
- **Example**: `GET /events/fad/tech-summit-2024`

#### Create Event
```http
POST /events/{eventType}
```
- **Description**: Create a new event
- **Authentication**: Required
- **Path Parameters**:
  - `eventType`: Type of event to create ("fad" or "event")
- **Body**: Event details (JSON)
- **Example**: `POST /events/fad`

#### Update Event
```http
PUT /events/{eventType}/{eventSlug}
```
- **Description**: Update an existing event
- **Authentication**: Required
- **Path Parameters**:
  - `eventType`: Type of event ("fad" or "event")
  - `eventSlug`: Event identifier to update
- **Body**: Event details to update (JSON)
- **Example**: `PUT /events/fad/tech-summit-2024`

#### Delete Event
```http
DELETE /events/{eventType}/{eventSlug}
```
- **Description**: Delete a specific event
- **Authentication**: Required
- **Path Parameters**:
  - `eventType`: Type of event ("fad" or "event")
  - `eventSlug`: Event identifier to delete
- **Example**: `DELETE /events/fad/tech-summit-2024`

### 2. Event Attendees Resource (Nested)

#### List Event Attendees
```http
GET /events/{eventSlug}/attendees
```
- **Description**: Retrieve all attendees for a specific event
- **Authentication**: Required
- **Path Parameters**:
  - `eventSlug`: Event identifier
- **Example**: `GET /events/tech-summit-2024/attendees`

#### Add Attendee (Manual Registration)
```http
POST /events/{eventSlug}/attendees
```
- **Description**: Manually register an attendee for an event
- **Authentication**: Required
- **Path Parameters**:
  - `eventSlug`: Event identifier
- **Body**: Attendee details (JSON)
- **Example**: `POST /events/tech-summit-2024/attendees`

#### Self-Registration
```http
POST /events/{eventSlug}/attendees/register
```
- **Description**: Self-service attendee registration with file upload
- **Path Parameters**:
  - `eventSlug`: Event identifier
- **Body**: Multipart form data (attendee details + payment screenshot)
- **Example**: `POST /events/tech-summit-2024/attendees/register`

#### Remove Attendee
```http
DELETE /events/{eventSlug}/attendees/{attendeeId}
```
- **Description**: Remove an attendee from an event
- **Authentication**: Required
- **Path Parameters**:
  - `eventSlug`: Event identifier
  - `attendeeId`: Attendee identifier (email)
- **Example**: `DELETE /events/tech-summit-2024/attendees/john@example.com`

### 3. Files Resource

#### Upload File
```http
POST /files
```
- **Description**: Upload a file to storage
- **Authentication**: Required
- **Body**: Multipart form data
- **Example**: `POST /files`

#### List Files
```http
GET /files
```
- **Description**: List all uploaded files
- **Authentication**: Required
- **Example**: `GET /files`

### 4. Quiz Resource (Nested under Events)

#### Upload Quiz
```http
POST /events/{eventId}/quiz
```
- **Description**: Upload a quiz for a specific event
- **Authentication**: Required
- **Path Parameters**:
  - `eventId`: Event identifier
- **Body**: Quiz data (JSON)
- **Example**: `POST /events/tech-summit-2024/quiz`

#### Get Quiz
```http
GET /events/{eventId}/quiz
```
- **Description**: Retrieve quiz for a specific event
- **Path Parameters**:
  - `eventId`: Event identifier
- **Example**: `GET /events/tech-summit-2024/quiz`

## RESTful Design Principles Applied

### 1. Resource-Based URLs
- URLs represent resources, not actions
- Clear hierarchy: `/events/{eventId}/attendees`
- Consistent naming conventions

### 2. HTTP Methods Usage
- `GET`: Retrieve resources
- `POST`: Create new resources
- `PUT`: Update existing resources (not used yet)
- `DELETE`: Remove resources

### 3. Query Parameters for Filtering
- Use query parameters for optional filters: `?type=conference`
- Path parameters for required identifiers: `/{eventId}`

### 4. Nested Resources
- Attendees are nested under events: `/events/{eventId}/attendees`
- Quiz is nested under events: `/events/{eventId}/quiz`

### 5. Consistent Response Format
- Standard HTTP status codes
- Consistent JSON response structure
- Proper error messages

## Migration from Old API

### Endpoint Mapping

| Old Endpoint | New Endpoint | Method Change |
|-------------|-------------|---------------|
| `GET /getEventList/{eventType}` | `GET /events?type={eventType}` | Query param |
| `GET /getEventDetails/{eventType}/{id}` | `GET /events/{eventType}/{id}` | Path structure |
| `POST /createEvent/{eventType}` | `POST /events/{eventType}` | Same |
| `POST /deleteEvent/{eventType}` | `DELETE /events/{eventType}/{id}` | Method + path |
| `GET /event-attendees/{eventSlug}` | `GET /events/{eventSlug}/attendees` | Nested resource |
| `POST /manual-attendee-registration` | `POST /events/{eventSlug}/attendees` | Nested resource |
| `POST /event-registration` | `POST /events/{eventSlug}/attendees/register` | Nested resource |
| `DELETE /event-attendees/{eventSlug}` | `DELETE /events/{eventSlug}/attendees/{id}` | Resource ID |
| `PUT /uploadFile` | `POST /files` | Method + resource |
| `GET /listFiles` | `GET /files` | Resource name |
| `POST /quiz/upload` | `POST /events/{eventId}/quiz` | Nested resource |
| `GET /quiz/{eventId}` | `GET /events/{eventId}/quiz` | Nested resource |

## Benefits of RESTful Design

1. **Intuitive**: URLs clearly represent resources and relationships
2. **Consistent**: Predictable patterns across all endpoints
3. **Scalable**: Easy to extend with new resources
4. **Standard**: Follows widely accepted REST conventions
5. **Cacheable**: GET requests can be easily cached
6. **Stateless**: Each request contains all necessary information