import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { UploadQuizInput, UploadQuizResponse } from "./functionTypes";

const BucketName = process.env.BUCKET_NAME;
const region = process.env.REGION;

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	const client = new S3Client({ region });

	try {
		if (!event.body) {
			throw new Error("Request body is required");
		}

		const input: UploadQuizInput = JSON.parse(event.body);
		
		if (!input.quiz || !input.quiz.eventId) {
			throw new Error("Quiz object with eventId is required");
		}

		// Extract the eventId and trim at the # symbol
		const eventIdParts = input.quiz.eventId.split('#');
		const trimmedEventId = eventIdParts[0];

		if (!trimmedEventId) {
			throw new Error("Invalid eventId format");
		}

		// Create the S3 key: eventId/quiz.json
		const key = `${trimmedEventId}/quiz.json`;

		// Convert the input to JSON string
		const jsonContent = JSON.stringify(input, null, 2);
		const buffer = Buffer.from(jsonContent, 'utf-8');

		// Upload to S3
		const putCommand = new PutObjectCommand({
			Bucket: BucketName,
			Key: key,
			Body: buffer,
			ContentType: 'application/json',
		});

		await client.send(putCommand);

		const response: UploadQuizResponse = {
			status: "OK",
			message: "Quiz uploaded successfully",
			key: key,
			eventId: trimmedEventId,
		};

		return {
			statusCode: 200,
			body: JSON.stringify(response),
		};
	} catch (error) {
		console.error("Error uploading quiz to S3:", error);
		return {
			statusCode: 400,
			body: JSON.stringify({
				status: "Error",
				message: (error as Error).message,
			}),
		};
	}
};