/** @format */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { CreateEventDTO } from "./functionTypes";

const TableName = process.env.TABLE_NAME;
const ddbDocClient = DynamoDBDocumentClient.from(
	new DynamoDBClient({ region: process.env.REGION }),
);

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log("Event: ", event);
	try {
		let input: CreateEventDTO;
		try {
			input = JSON.parse(event.body ?? "");
		} catch (error) {
			console.error("Error parsing JSON: ", error);
			return {
				statusCode: 400,
				body: JSON.stringify({ status: "Error", message: "Invalid JSON" }),
			};
		}

		const eventType = event.pathParameters?.eventType;
		
		if (!eventType) {
			return {
				statusCode: 400,
				body: JSON.stringify({ 
					status: "Error", 
					message: "Missing eventType path parameter" 
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
			...input,
			pk: partitionKey,
			sk: `${input.slug}#${input.creationDate}`,
			eventType: partitionKey,
		};

		await ddbDocClient.send(
			new PutCommand({
				TableName,
				Item: Item,
			}),
		);

		return {
			statusCode: 200,
			body: JSON.stringify(Item),
		};
	} catch (error) {
		console.error("Error: ", error);

		return {
			statusCode: 400,
			body: JSON.stringify({ status: "Error", message: error }),
		};
	}
};
