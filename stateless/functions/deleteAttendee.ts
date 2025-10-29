/** @format */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
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
		const eventSlug = event.pathParameters?.eventSlug;
		const attendeeId = event.pathParameters?.attendeeId; // RESTful: attendeeId in path

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

		// Use attendeeId (email) from path parameter
		const email = attendeeId;

		// First check if the attendee exists
		const getParams = {
			TableName,
			Key: {
				pk: `${eventSlug}#ATTENDEE`,
				sk: email,
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

		// Delete the attendee
		const deleteParams = {
			TableName,
			Key: {
				pk: `${eventSlug}#ATTENDEE`,
				sk: email,
			},
		};

		await ddbDocClient.send(new DeleteCommand(deleteParams));

		return {
			statusCode: 200,
			body: JSON.stringify({
				status: "OK",
				message: "Attendee deleted successfully",
				deletedAttendee: {
					eventSlug,
					email,
					firstName: existingAttendee.Item.firstName,
					lastName: existingAttendee.Item.lastName,
				},
				deletedBy: event.requestContext?.authorizer?.jwt?.claims?.username || "admin",
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