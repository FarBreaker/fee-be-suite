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
		// Get eventSlug from path parameter (RESTful: POST /quiz/{eventSlug})
		const eventSlug = event.pathParameters?.eventSlug;
		
		if (!eventSlug) {
			throw new Error("Missing eventSlug path parameter");
		}

		if (!event.body) {
			throw new Error("Request body is required");
		}

		const input: UploadQuizInput = JSON.parse(event.body);
		
		if (!input.quiz) {
			throw new Error("Quiz object is required");
		}

		// Use eventSlug from path parameter
		const key = `${eventSlug}/quiz.json`;

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
			eventSlug: eventSlug,
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