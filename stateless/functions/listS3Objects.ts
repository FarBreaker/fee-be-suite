import {
	ListObjectsCommand,
	type ListObjectsCommandInput,
	S3Client,
} from "@aws-sdk/client-s3";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const BucketName = process.env.BUCKET_NAME;
const region = process.env.REGION;

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	const client = new S3Client({ region });

	try {
		const input: ListObjectsCommandInput = {
			Bucket: BucketName,
		};
		const command = new ListObjectsCommand(input);
		const response = await client.send(command);

		return {
			statusCode: 200,
			body: JSON.stringify({
				status: "OK",
				contents: response.Contents,
			}),
		};
	} catch (error) {
		console.error("Error: ", error);
		return {
			statusCode: 400,
			body: JSON.stringify({
				status: "Error",
				message: (error as Error).message,
			}),
		};
	}
};
