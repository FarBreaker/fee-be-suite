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
	console.log("Event: ", event);
	
	try {
		let formData: Record<string, string>;
		
		try {
			formData = JSON.parse(event.body ?? "");
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

		// Validate required fields
		const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'eventSlug', 'eventType'];
		for (const field of requiredFields) {
			if (!formData[field]) {
				return {
					statusCode: 400,
					body: JSON.stringify({ 
						status: "Error", 
						message: `Missing required field: ${field}` 
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
					message: "Invalid email format" 
				}),
			};
		}

		// Save participant data to DynamoDB
		const participantItem = {
			pk: `${formData.eventSlug}#PARTICIPANT`,
			sk: formData.email,
			firstName: formData.firstName,
			lastName: formData.lastName,
			email: formData.email,
			phone: formData.phone,
			eventSlug: formData.eventSlug,
			eventType: formData.eventType,
			registrationDate: new Date().toISOString(),
            attendanceStatus: "VERIFIED",
			registrationType: "manual", // Field to identify manual registration
			registeredBy: event.requestContext?.authorizer?.jwt?.claims?.email || "admin", // Who registered this participant
		};

		await ddbDocClient.send(
			new PutCommand({
				TableName,
				Item: participantItem,
			}),
		);

		return {
			statusCode: 200,
			body: JSON.stringify({
				status: "OK",
				message: "Manual registration successful",
				participantId: formData.email,
				registrationType: "manual",
				registeredBy: participantItem.registeredBy,
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