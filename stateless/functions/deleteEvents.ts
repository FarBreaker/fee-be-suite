/** @format */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { DeleteEventInput } from "./functionTypes";

const TableName = process.env.TABLE_NAME;
const ddbDocClient = DynamoDBDocumentClient.from(
	new DynamoDBClient({ region: process.env.REGION }),
);

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log("Event: ", event);
	try {
		let input: DeleteEventInput;
		try {
			input = JSON.parse(event.body ?? "");
		} catch (error) {
			console.error("Error parsing JSON: ", error);
			return {
				statusCode: 400,
				body: JSON.stringify({ status: "Error", message: "Invalid JSON" }),
			};
		}

		const Item = {
			pk: event.pathParameters?.eventType,
			sk: input.sk,
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
