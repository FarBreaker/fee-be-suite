/** @format */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const TableName = process.env.TABLE_NAME;
const region = process.env.REGION;
const ddbDocClient = DynamoDBDocumentClient.from(
	new DynamoDBClient({ region }),
);

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	try {
		// Get eventSlug from path parameter (RESTful: POST /events/{eventSlug}/attendees)
		const eventSlug = event.pathParameters?.eventSlug;
		
		if (!eventSlug) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					status: "Error",
					message: "Missing eventSlug path parameter"
				}),
			};
		}

		let formData: Record<string, string>;

		try {
			formData = JSON.parse(event.body ?? "");
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

		// Add eventSlug to formData for processing
		formData.eventSlug = eventSlug;

		// Validate required fields (eventSlug now comes from path, not body)
		const requiredFields = [
			"firstName",
			"lastName",
			"email",
			"phone",
			"profession",
			"eventType",
		];
		for (const field of requiredFields) {
			if (!formData[field]) {
				return {
					statusCode: 400,
					body: JSON.stringify({
						status: "Error",
						message: `Missing required field: ${field}`,
					}),
				};
			}
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(formData.email)) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					status: "Error",
					message: "Invalid email format",
				}),
			};
		}

		// Save attendee data to DynamoDB
		const attendeeItem = {
			pk: `${formData.eventSlug}#ATTENDEE`,
			sk: formData.email,
			firstName: formData.firstName,
			lastName: formData.lastName,
			email: formData.email,
			phone: formData.phone,
			profession: formData.profession,
			eventSlug: formData.eventSlug,
			eventType: formData.eventType,
			registrationDate: new Date().toISOString(),
			attendanceStatus: "VERIFIED",
			registrationType: "manual", // Field to identify manual registration
			registeredBy:
				event.requestContext?.authorizer?.jwt?.claims?.username || "admin", // Who registered this attendee
		};

		await ddbDocClient.send(
			new PutCommand({
				TableName,
				Item: attendeeItem,
				ConditionExpression:
					"attribute_not_exists(pk) AND attribute_not_exists(sk)", // Ensure the item doesn't exist before registrati
			}),
		);

		return {
			statusCode: 200,
			body: JSON.stringify({
				status: "OK",
				message: "Manual registration successful",
				attendeeId: formData.email,
				registrationType: "manual",
				registeredBy: attendeeItem.registeredBy,
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
