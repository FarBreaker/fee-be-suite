/** @format */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";


const TableName = process.env.TABLE_NAME;
const ddbDocClient = DynamoDBDocumentClient.from(
	new DynamoDBClient({ region: process.env.REGION }),
);

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log("Event: ", event);
	try {
		// Get eventType and eventSlug from path parameters (RESTful: DELETE /events/{eventType}/{eventSlug})
		const eventType = event.pathParameters?.eventType;
		const eventSlug = event.pathParameters?.eventSlug;

		if (!eventType) {
			return {
				statusCode: 400,
				body: JSON.stringify({ 
					status: "Error", 
					message: "Missing eventType path parameter" 
				}),
			};
		}

		if (!eventSlug) {
			return {
				statusCode: 400,
				body: JSON.stringify({ 
					status: "Error", 
					message: "Missing eventSlug path parameter" 
				}),
			};
		}

		// Map the eventType to the correct partition key
		const partitionKey = eventType.toUpperCase(); // Convert to uppercase (FAD or EVENT)
		
		if (partitionKey !== "FAD" && partitionKey !== "EVENT") {
			return {
				statusCode: 400,
				body: JSON.stringify({ 
					status: "Error", 
					message: "Invalid eventType parameter. Must be 'fad' or 'event'" 
				}),
			};
		}

		const Item = {
			pk: partitionKey,
			sk: eventSlug,
		};

		await ddbDocClient.send(
			new DeleteCommand({
				TableName,
				Key: Item,
			}),
		);

		return {
			statusCode: 200,
			body: JSON.stringify({
				status: "OK",
			}),
		};
	} catch (error) {
		console.error("Error: ", error);

		return {
			statusCode: 400,
			body: JSON.stringify({ status: "Error", message: error }),
		};
	}
};
