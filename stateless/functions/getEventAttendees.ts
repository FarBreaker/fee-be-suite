/** @format */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
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

		if (!eventSlug) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					status: "Error",
					message: "Missing eventSlug path parameter",
				}),
			};
		}

		// Query all attendees for the event
		const queryParams = {
			TableName,
			KeyConditionExpression: "pk = :pk",
			ExpressionAttributeValues: {
				":pk": `${eventSlug}#ATTENDEE`,
			},
		};

		const result = await ddbDocClient.send(new QueryCommand(queryParams));

		// Transform the data to remove DynamoDB keys and format for response
		const attendees =
			result.Items?.map((item) => ({
				firstName: item.firstName,
				lastName: item.lastName,
				email: item.email,
				phone: item.phone,
				eventSlug: item.eventSlug,
				eventType: item.eventType,
				paymentScreenshotKey: item.paymentScreenshotKey,
				attendanceStatus: item.attendanceStatus,
				profession: item.profession,
				registrationDate: item.registrationDate,
				registrationType: item.registrationType || "self-service", // Default for backward compatibility
				registeredBy: item.registeredBy,
			})) || [];

		return {
			statusCode: 200,
			body: JSON.stringify({
				status: "OK",
				eventSlug,
				attendeeCount: attendees.length,
				attendees,
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
