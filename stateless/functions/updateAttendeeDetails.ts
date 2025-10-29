/** @format */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
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
		// Get eventSlug and attendeeId from path parameters
		const eventSlug = event.pathParameters?.eventSlug;
		const attendeeId = event.pathParameters?.attendeeId;

		if (!eventSlug) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					status: "Error",
					message: "Missing eventSlug path parameter"
				}),
			};
		}

		if (!attendeeId) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					status: "Error",
					message: "Missing attendeeId path parameter"
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
					message: "Invalid JSON format"
				}),
			};
		}

		// Remove any attempt to update the status field
		delete updateData.attendanceStatus;
		delete updateData.pk;
		delete updateData.sk;

		if (Object.keys(updateData).length === 0) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					status: "Error",
					message: "No valid fields to update"
				}),
			};
		}

		// First check if the attendee exists
		const getParams = {
			TableName,
			Key: {
				pk: `${eventSlug}#ATTENDEE`,
				sk: attendeeId,
			},
		};

		const existingAttendee = await ddbDocClient.send(new GetCommand(getParams));

		if (!existingAttendee.Item) {
			return {
				statusCode: 404,
				body: JSON.stringify({
					status: "Error",
					message: "Attendee not found"
				}),
			};
		}

		// Build update expression dynamically
		const updateExpressionParts: string[] = [];
		const expressionAttributeNames: Record<string, string> = {};
		const expressionAttributeValues: Record<string, string | number | boolean> = {};

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
		expressionAttributeNames[updatedDateAttr] = 'updatedDate';
		expressionAttributeValues[updatedDateVal] = new Date().toISOString();

		// Add updatedBy
		const updatedByAttr = `#attr${Object.keys(updateData).length + 1}`;
		const updatedByVal = `:val${Object.keys(updateData).length + 1}`;
		updateExpressionParts.push(`${updatedByAttr} = ${updatedByVal}`);
		expressionAttributeNames[updatedByAttr] = 'updatedBy';
		expressionAttributeValues[updatedByVal] = event.requestContext?.authorizer?.jwt?.claims?.username || "admin";

		const updateParams = {
			TableName,
			Key: {
				pk: `${eventSlug}#ATTENDEE`,
				sk: attendeeId,
			},
			UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
			ExpressionAttributeNames: expressionAttributeNames,
			ExpressionAttributeValues: expressionAttributeValues,
			ReturnValues: "ALL_NEW" as const,
		};

		const result = await ddbDocClient.send(new UpdateCommand(updateParams));

		return {
			statusCode: 200,
			body: JSON.stringify({
				status: "OK",
				message: "Attendee details updated successfully",
				updatedAttendee: {
					eventSlug,
					attendeeId,
					firstName: result.Attributes?.firstName,
					lastName: result.Attributes?.lastName,
					email: result.Attributes?.email,
					phone: result.Attributes?.phone,
					profession: result.Attributes?.profession,
					attendanceStatus: result.Attributes?.attendanceStatus,
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
				message: error instanceof Error ? error.message : "Internal server error"
			}),
		};
	}
};