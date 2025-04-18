/** @format */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { CreateFADInput, CreateReventInput } from "./functionTypes";

const TableName = process.env.TABLE_NAME;
const ddbDocClient = DynamoDBDocumentClient.from(
	new DynamoDBClient({ region: process.env.REGION }),
);

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log("Event: ", event);
	try {
		const qRes = await ddbDocClient.send(
			new QueryCommand({
				TableName,
				ExpressionAttributeNames: {
					"#eventType": "pk",
				},
				KeyConditionExpression: "#eventType = :eventType",
				ExpressionAttributeValues: {
					":eventType": event.pathParameters?.eventType,
				},
			}),
		);

		return {
			statusCode: 200,
			body: JSON.stringify({
				Item: qRes.Items,
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
