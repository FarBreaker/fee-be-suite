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
		// Get eventType from query parameters (RESTful: GET /events?type=fad or GET /events?type=event)
		const eventType = event.queryStringParameters?.type;
		
		if (!eventType) {
			return {
				statusCode: 400,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				},
				body: JSON.stringify({ 
					error: "Missing required query parameter: type (should be 'fad' or 'event')" 
				}),
			};
		}

		// Map the query parameter to the correct partition key
		const partitionKey = eventType.toUpperCase(); // Convert to uppercase (FAD or EVENT)
		
		if (partitionKey !== "FAD" && partitionKey !== "EVENT") {
			return {
				statusCode: 400,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				},
				body: JSON.stringify({ 
					error: "Invalid type parameter. Must be 'fad' or 'event'" 
				}),
			};
		}

		const result = await ddbDocClient.send(
			new QueryCommand({
				TableName,
				KeyConditionExpression: "pk = :partitionKey",
				ExpressionAttributeValues: {
					":partitionKey": partitionKey,
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