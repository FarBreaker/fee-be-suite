import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { UploadQuizInput } from "./functionTypes";

const BucketName = process.env.BUCKET_NAME;
const region = process.env.REGION;

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	const client = new S3Client({ region });

	try {
		// Get eventId from path parameters
		const eventId = event.pathParameters?.eventId;
		
		if (!eventId) {
			throw new Error("EventId is required in path parameters");
		}

		// Create the S3 key: eventId/quiz.json
		const key = `${eventId}/quiz.json`;

		// Get object from S3
		const getCommand = new GetObjectCommand({
			Bucket: BucketName,
			Key: key,
		});

		const response = await client.send(getCommand);
		
		if (!response.Body) {
			throw new Error("Quiz not found");
		}

		// Convert stream to string
		const bodyContents = await response.Body.transformToString();
		const quizData: UploadQuizInput = JSON.parse(bodyContents);

		return {
			statusCode: 200,
			body: JSON.stringify(quizData),
			headers: {
				'Content-Type': 'application/json',
			},
		};
	} catch (error) {
		console.error("Error retrieving quiz from S3:", error);
		
		// Handle specific S3 errors
		if ((error as Error & { name: string }).name === 'NoSuchKey') {
			return {
				statusCode: 404,
				body: JSON.stringify({
					status: "Error",
					message: "Quiz not found",
				}),
			};
		}

		return {
			statusCode: 400,
			body: JSON.stringify({
				status: "Error",
				message: (error as Error).message,
			}),
		};
	}
};