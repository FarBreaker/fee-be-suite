/** @format */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	QueryCommand,
	UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const TableName = process.env.TABLE_NAME;
const region = process.env.REGION;

const ddbDocClient = DynamoDBDocumentClient.from(
	new DynamoDBClient({ region }),
);

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log("Event: ", event);

	try {
		// Get eventType and eventSlug from path parameters
		const eventType = event.pathParameters?.eventType;
		const eventSlug = event.pathParameters?.eventSlug;

		if (!eventType) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					status: "Error",
					message: "Missing eventType path parameter",
				}),
			};
		}

		if (!eventSlug) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					status: "Error",
					message: "Missing eventSlug path parameter",
				}),
			};
		}

		let updateData: Record<string, string | number | boolean>;

		try {
			updateData = JSON.parse(event.body ?? "");
		} catch (error) {
			console.error("Error parsing JSON: ", error);
			return {
				statusCode: 400,
				body: JSON.stringify({
					status: "Error",
					message: "Invalid JSON format",
				}),
			};
		}

		// Remove any attempt to update protected fields
		delete updateData.pk;
		delete updateData.sk;
		delete updateData.eventType; // eventType should not be changed via update

		if (Object.keys(updateData).length === 0) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					status: "Error",
					message: "No valid fields to update",
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
					message: "Invalid eventType parameter. Must be 'fad' or 'event'",
				}),
			};
		}

		// First check if the event exists using Query with begins_with
		const queryParams = {
			TableName,
			KeyConditionExpression:
				"pk = :partitionKey AND begins_with(sk, :eventSlug)",
			ExpressionAttributeValues: {
				":partitionKey": partitionKey,
				":eventSlug": eventSlug,
			},
		};

		const existingEvent = await ddbDocClient.send(
			new QueryCommand(queryParams),
		);

		if (!existingEvent.Items || existingEvent.Items.length === 0) {
			return {
				statusCode: 404,
				body: JSON.stringify({
					status: "Error",
					message: "Event not found",
				}),
			};
		}

		// Get the first (and should be only) matching event
		const eventItem = existingEvent.Items[0];
		const actualSortKey = eventItem.sk;

		// Build update expression dynamically
		const updateExpressionParts: string[] = [];
		const expressionAttributeNames: Record<string, string> = {};
		const expressionAttributeValues: Record<string, string | number | boolean> =
			{};

		Object.keys(updateData).forEach((key, index) => {
			const attributeName = `#attr${index}`;
			const attributeValue = `:val${index}`;

			updateExpressionParts.push(`${attributeName} = ${attributeValue}`);
			expressionAttributeNames[attributeName] = key;
			expressionAttributeValues[attributeValue] = updateData[key];
		});

		// Add updatedDate
		const updatedDateAttr = `#attr${Object.keys(updateData).length}`;
		const updatedDateVal = `:val${Object.keys(updateData).length}`;
		updateExpressionParts.push(`${updatedDateAttr} = ${updatedDateVal}`);
		expressionAttributeNames[updatedDateAttr] = "updatedDate";
		expressionAttributeValues[updatedDateVal] = new Date().toISOString();

		// Add updatedBy
		const updatedByAttr = `#attr${Object.keys(updateData).length + 1}`;
		const updatedByVal = `:val${Object.keys(updateData).length + 1}`;
		updateExpressionParts.push(`${updatedByAttr} = ${updatedByVal}`);
		expressionAttributeNames[updatedByAttr] = "updatedBy";
		expressionAttributeValues[updatedByVal] =
			event.requestContext?.authorizer?.jwt?.claims?.username || "admin";

		const updateParams = {
			TableName,
			Key: {
				pk: partitionKey,
				sk: actualSortKey, // Use the actual sort key from the query result
			},
			UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
			ExpressionAttributeNames: expressionAttributeNames,
			ExpressionAttributeValues: expressionAttributeValues,
			ReturnValues: "ALL_NEW" as const,
		};

		const result = await ddbDocClient.send(new UpdateCommand(updateParams));

		return {
			statusCode: 200,
			body: JSON.stringify({
				status: "OK",
				message: "Event updated successfully",
				updatedEvent: {
					eventType: partitionKey,
					eventSlug,
					title: result.Attributes?.title,
					description: result.Attributes?.description,
					date: result.Attributes?.date,
					location: result.Attributes?.location,
					maxAttendees: result.Attributes?.maxAttendees,
					price: result.Attributes?.price,
					status: result.Attributes?.status,
					updatedDate: result.Attributes?.updatedDate,
					updatedBy: result.Attributes?.updatedBy,
				},
			}),
		};
	} catch (error) {
		console.error("Error: ", error);

		return {
			statusCode: 500,
			body: JSON.stringify({
				status: "Error",
				message:
					error instanceof Error ? error.message : "Internal server error",
			}),
		};
	}
};
