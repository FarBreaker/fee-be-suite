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

		// Update only the attendance status to VERIFIED
		const updateParams = {
			TableName,
			Key: {
				pk: `${eventSlug}#ATTENDEE`,
				sk: attendeeId,
			},
			UpdateExpression: "SET attendanceStatus = :status, verifiedDate = :verifiedDate, verifiedBy = :verifiedBy",
			ExpressionAttributeValues: {
				":status": "VERIFIED",
				":verifiedDate": new Date().toISOString(),
				":verifiedBy": event.requestContext?.authorizer?.jwt?.claims?.username || "admin",
			},
			ReturnValues: "ALL_NEW" as const,
		};

		const result = await ddbDocClient.send(new UpdateCommand(updateParams));

		return {
			statusCode: 200,
			body: JSON.stringify({
				status: "OK",
				message: "Attendee status updated to VERIFIED successfully",
				updatedAttendee: {
					eventSlug,
					attendeeId,
					firstName: result.Attributes?.firstName,
					lastName: result.Attributes?.lastName,
					email: result.Attributes?.email,
					attendanceStatus: result.Attributes?.attendanceStatus,
					verifiedDate: result.Attributes?.verifiedDate,
					verifiedBy: result.Attributes?.verifiedBy,
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