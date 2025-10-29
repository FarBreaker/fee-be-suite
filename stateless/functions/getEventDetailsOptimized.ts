/** @format */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const TableName = process.env.TABLE_NAME;
const ddbDocClient = DynamoDBDocumentClient.from(
	new DynamoDBClient({ region: process.env.REGION }),
);

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	try {
		const eventType = event.pathParameters?.eventType;
		const eventSlug = event.pathParameters?.eventSlug;
		
		if (!eventType || !eventSlug) {
			return {
				statusCode: 400,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				},
				body: JSON.stringify({ 
					error: "Missing eventType or eventSlug path parameters" 
				}),
			};
		}

		// Map the eventType to the correct partition key
		const partitionKey = eventType.toUpperCase(); // Convert to uppercase (FAD or EVENT)
		
		if (partitionKey !== "FAD" && partitionKey !== "EVENT") {
			return {
				statusCode: 400,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				},
				body: JSON.stringify({ 
					error: "Invalid eventType parameter. Must be 'fad' or 'event'" 
				}),
			};
		}

		const result = await ddbDocClient.send(
			new QueryCommand({
				TableName,
				KeyConditionExpression: "pk = :partitionKey AND begins_with(sk, :eventSlug)",
				ExpressionAttributeValues: {
					":partitionKey": partitionKey,
					":eventSlug": eventSlug,
				},
			}),
		);

		return {
			statusCode: 200,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
			body: JSON.stringify(result.Items),
		};
	} catch (error) {
		return {
			statusCode: 500,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
			body: JSON.stringify({ 
				error: error instanceof Error ? error.message : "Internal server error" 
			}),
		};
	}
};