/** @format */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	UpdateCommand,
	QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { DynamoDBStreamEvent, DynamoDBRecord } from "aws-lambda";

const TableName = process.env.TABLE_NAME;
const region = process.env.REGION;

const ddbDocClient = DynamoDBDocumentClient.from(
	new DynamoDBClient({ region }),
);

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
	console.log("DynamoDB Stream Event:", JSON.stringify(event, null, 2));

	try {
		// Process each record in the stream
		for (const record of event.Records) {
			await processStreamRecord(record);
		}
	} catch (error) {
		console.error("Error processing DynamoDB stream:", error);
		throw error;
	}
};

async function processStreamRecord(record: DynamoDBRecord): Promise<void> {
	const { eventName } = record;

	// Only process attendee records
	if (!isAttendeeRecord(record)) {
		console.log("Skipping non-attendee record");
		return;
	}

	const eventSlug = extractEventSlug(record);
	if (!eventSlug) {
		console.log("Could not extract eventSlug from record");
		return;
	}

	console.log(`Processing ${eventName} for attendee in event: ${eventSlug}`);

	switch (eventName) {
		case "INSERT":
			await incrementAttendeeCount(eventSlug);
			break;
		case "REMOVE":
			await decrementAttendeeCount(eventSlug);
			break;
		case "MODIFY":
			// For MODIFY events, we don't change the counter as the attendee still exists
			console.log("MODIFY event - no counter change needed");
			break;
		default:
			console.log(`Unhandled event type: ${eventName}`);
	}
}

function isAttendeeRecord(record: DynamoDBRecord): boolean {
	// Check if this is an attendee record by looking at the partition key
	const pk =
		record.dynamodb?.Keys?.pk?.S ||
		record.dynamodb?.NewImage?.pk?.S ||
		record.dynamodb?.OldImage?.pk?.S;

	return pk ? pk.includes("#ATTENDEE") : false;
}

function extractEventSlug(record: DynamoDBRecord): string | null {
	// Extract eventSlug from the partition key (format: {eventSlug}#ATTENDEE)
	const pk =
		record.dynamodb?.Keys?.pk?.S ||
		record.dynamodb?.NewImage?.pk?.S ||
		record.dynamodb?.OldImage?.pk?.S;

	if (!pk) return null;

	const parts = pk.split("#");
	return parts.length > 0 ? parts[0] : null;
}

async function incrementAttendeeCount(eventSlug: string): Promise<void> {
	try {
		// First, try to find the event record to get its eventType
		const eventRecord = await findEventRecord(eventSlug);

		if (!eventRecord) {
			console.error(`Event record not found for eventSlug: ${eventSlug}`);
			return;
		}

		const { pk: eventType, sk: eventId } = eventRecord;

		await ddbDocClient.send(
			new UpdateCommand({
				TableName,
				Key: {
					pk: eventType,
					sk: eventId,
				},
				UpdateExpression: "ADD attendeeCount :inc",
				ExpressionAttributeValues: {
					":inc": 1,
				},
			}),
		);

		console.log(`Incremented attendee count for event: ${eventSlug}`);
	} catch (error) {
		console.error(`Error incrementing attendee count for ${eventSlug}:`, error);
		throw error;
	}
}

async function decrementAttendeeCount(eventSlug: string): Promise<void> {
	// First, try to find the event record to get its eventType
	const eventRecord = await findEventRecord(eventSlug);

	if (!eventRecord) {
		console.error(`Event record not found for eventSlug: ${eventSlug}`);
		return;
	}

	const { pk: eventType, sk: eventId } = eventRecord;

	try {
		await ddbDocClient.send(
			new UpdateCommand({
				TableName,
				Key: {
					pk: eventType,
					sk: eventId,
				},
				UpdateExpression: "ADD attendeeCount :dec",
				ExpressionAttributeValues: {
					":dec": -1,
					":zero": 0,
				},
				// Ensure we don't go below 0
				ConditionExpression:
					"attribute_exists(attendeeCount) AND attendeeCount > :zero",
			}),
		);

		console.log(`Decremented attendee count for event: ${eventSlug}`);
	} catch (error: unknown) {
		const err = error as { name?: string };
		if (err.name === "ConditionalCheckFailedException") {
			console.log(`Attendee count already at minimum for event: ${eventSlug}`);
			// Try to set it to 0 if it doesn't exist or is negative
			try {
				await ddbDocClient.send(
					new UpdateCommand({
						TableName,
						Key: {
							pk: eventType,
							sk: eventId,
						},
						UpdateExpression: "SET attendeeCount = :zero",
						ExpressionAttributeValues: {
							":zero": 0,
						},
					}),
				);
				console.log(`Reset attendee count to 0 for event: ${eventSlug}`);
			} catch (resetError) {
				console.error(
					`Error resetting attendee count for ${eventSlug}:`,
					resetError,
				);
			}
		} else {
			console.error(
				`Error decrementing attendee count for ${eventSlug}:`,
				error,
			);
			throw error;
		}
	}
}

async function findEventRecord(
	eventSlug: string,
): Promise<{ pk: string; sk: string } | null> {
	// Event records use either "FAD" or "EVENT" as partition keys
	const eventPartitionKeys = ["FAD", "EVENT"];

	for (const pk of eventPartitionKeys) {
		try {
			// Use Query with begins_with since the sort key is composite (eventSlug#additionalData)
			const result = await ddbDocClient.send(
				new QueryCommand({
					TableName,
					KeyConditionExpression: "pk = :pk AND begins_with(sk, :eventSlug)",
					ExpressionAttributeValues: {
						":pk": pk,
						":eventSlug": eventSlug,
					},
					Limit: 1, // We only need the first match
				}),
			);

			if (result.Items && result.Items.length > 0) {
				const item = result.Items[0];
				console.log(
					`Found event record: pk=${pk}, sk=${item.sk} for eventSlug=${eventSlug}`,
				);
				return {
					pk: pk,
					sk: item.sk,
				};
			}
		} catch (error: unknown) {
			const err = error as { message?: string };
			console.log(
				`Event not found in ${pk} for slug ${eventSlug}:`,
				err.message || "Unknown error",
			);
		}
	}

	// If not found in either partition key, log the issue but don't fail
	console.warn(
		`Could not find event record for eventSlug: ${eventSlug} in FAD or EVENT partitions. Counter update skipped.`,
	);
	return null;
}
