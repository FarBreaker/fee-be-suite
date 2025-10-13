# Upload Quiz to S3 API

## Overview
The `uploadQuizToS3` Lambda function uploads quiz data as a JSON file to S3. It takes quiz data with metadata and stores it in the S3 bucket using the eventId as the folder structure.

## Endpoint
- **Method**: POST
- **Path**: `/upload-quiz`
- **Authorization**: Required (Cognito User Pool)

## Request Body
The function expects a JSON object with the following structure:

```json
{
  "quiz": {
    "id": "1ff2a5c9-7b96-4cd2-ad43-4e31ba64cca5",
    "title": "Test Quiz",
    "questions": [
      {
        "id": "d7ed25f9-f388-4311-a104-d435d0113f13",
        "question": "What is the correct answer?",
        "answers": [
          {
            "id": "158fa5c8-da9f-4299-a41d-728b111abf35",
            "text": "Option A",
            "isCorrect": false
          },
          {
            "id": "39c057b9-b7d8-400a-8b4f-9864ff652d17",
            "text": "Option B",
            "isCorrect": true
          },
          {
            "id": "69771276-3f0f-48e8-95bd-9b5dafc3f50f",
            "text": "Option C",
            "isCorrect": false
          }
        ]
      }
    ],
    "createdAt": "2025-10-08T14:05:44.962Z",
    "updatedAt": "2025-10-08T14:05:44.962Z",
    "eventId": "tanka25#2025-06-13",
    "eventTitle": "Educazione Continua in Oftalmologia 2025"
  },
  "metadata": {
    "questionCount": 1,
    "totalAnswers": 3,
    "averageAnswersPerQuestion": 3,
    "hasEventAssociation": true,
    "uploadTimestamp": "2025-10-08T14:05:45.002Z",
    "fileSize": 774
  }
}
```

## Response
### Success (200)
```json
{
  "status": "OK",
  "message": "Quiz uploaded successfully",
  "key": "tanka25/quiz.json",
  "eventId": "tanka25"
}
```

### Error (400)
```json
{
  "status": "Error",
  "message": "Error description"
}
```

## Behavior
1. **Event ID Processing**: The function extracts the eventId from the quiz object and trims it at the `#` symbol, using only the first part as the S3 key prefix.
   - Example: `"tanka25#2025-06-13"` becomes `"tanka25"`

2. **S3 Key Structure**: Files are stored with the pattern `{eventId}/quiz.json`
   - Example: `tanka25/quiz.json`

3. **File Format**: The entire input object (quiz + metadata) is stored as a formatted JSON file in S3.

## Environment Variables
- `BUCKET_NAME`: The S3 bucket name where files will be uploaded
- `REGION`: AWS region for S3 operations

## Error Handling
The function handles the following error cases:
- Missing request body
- Missing quiz object or eventId
- Invalid eventId format (empty after trimming)
- S3 upload failures

## Usage Example
```bash
curl -X POST https://your-api-gateway-url/v1/upload-quiz \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_COGNITO_TOKEN" \
  -d @quiz-data.json
```
--
-

# Get Quiz from S3 API

## Overview
The `getQuizFromS3` Lambda function retrieves quiz data from S3 based on the eventId. It returns the complete quiz JSON that was previously uploaded.

## Endpoint
- **Method**: GET
- **Path**: `/quiz/{eventId}`
- **Authorization**: None (public endpoint)

## Path Parameters
- `eventId` (required): The event identifier (trimmed part before #)

## Response
### Success (200)
Returns the complete quiz JSON object:
```json
{
  "quiz": {
    "id": "1ff2a5c9-7b96-4cd2-ad43-4e31ba64cca5",
    "title": "Test Quiz",
    "questions": [
      {
        "id": "d7ed25f9-f388-4311-a104-d435d0113f13",
        "question": "What is the correct answer?",
        "answers": [
          {
            "id": "158fa5c8-da9f-4299-a41d-728b111abf35",
            "text": "Option A",
            "isCorrect": false
          },
          {
            "id": "39c057b9-b7d8-400a-8b4f-9864ff652d17",
            "text": "Option B",
            "isCorrect": true
          },
          {
            "id": "69771276-3f0f-48e8-95bd-9b5dafc3f50f",
            "text": "Option C",
            "isCorrect": false
          }
        ]
      }
    ],
    "createdAt": "2025-10-08T14:05:44.962Z",
    "updatedAt": "2025-10-08T14:05:44.962Z",
    "eventId": "tanka25#2025-06-13",
    "eventTitle": "Educazione Continua in Oftalmologia 2025"
  },
  "metadata": {
    "questionCount": 1,
    "totalAnswers": 3,
    "averageAnswersPerQuestion": 3,
    "hasEventAssociation": true,
    "uploadTimestamp": "2025-10-08T14:05:45.002Z",
    "fileSize": 774
  }
}
```

### Not Found (404)
```json
{
  "status": "Error",
  "message": "Quiz not found"
}
```

### Error (400)
```json
{
  "status": "Error",
  "message": "Error description"
}
```

## Behavior
1. **Event ID Lookup**: Uses the provided eventId to construct the S3 key `{eventId}/quiz.json`
2. **File Retrieval**: Fetches the JSON file from S3 and returns the complete content
3. **Error Handling**: Returns 404 if the quiz doesn't exist, 400 for other errors

## Usage Example
```bash
# Get quiz for event "tanka25"
curl -X GET https://your-api-gateway-url/v1/quiz/tanka25
```

## Notes
- This endpoint is public (no authentication required) for easy quiz access
- The eventId should be the trimmed version (before the # symbol)
- Returns the exact same JSON structure that was uploaded via the upload endpoint