/** @format */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { type PutObjectCommandInput, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import Busboy from "busboy";
import { fileTypeFromBuffer } from "file-type";
import { v4 as uuidv4 } from "uuid";


const TableName = process.env.TABLE_NAME;
const BucketName = process.env.BUCKET_NAME;
const region = process.env.REGION;

const ddbDocClient = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region }),
);
const s3Client = new S3Client({ region });

export const handler = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    console.log("Event: ", event);

    try {
        const contentType = event.headers["content-type"] || event.headers["Content-Type"];

        if (!event.body || !event.isBase64Encoded || !contentType) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    status: "Error",
                    message: "Invalid input - multipart form data required"
                }),
            };
        }

        const bodyBuffer = Buffer.from(event.body, "base64");
        const parsed = await parseFormData(bodyBuffer, contentType);

        if (!parsed) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    status: "Error",
                    message: "Failed to parse form data"
                }),
            };
        }

        const { formData, fileData } = parsed;

        // Get eventSlug from path parameter (RESTful: POST /events/{eventSlug}/attendees/register)
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

        // Add eventSlug to formData for backward compatibility
        formData.eventSlug = eventSlug;

        // Validate required fields (eventSlug now comes from path, not form)
        const requiredFields = ['firstName', 'lastName', 'email', 'eventType'];
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

        let paymentScreenshotKey = null;

        // Upload payment screenshot to S3 if provided
        if (fileData) {
            const fileType = await fileTypeFromBuffer(fileData.buffer);
            const extension = fileType?.ext || 'png';
            const uuid = uuidv4();
            const key = `${formData.eventSlug}/payments/${uuid}.${extension}`;

            const putItem: PutObjectCommandInput = {
                Bucket: BucketName,
                Key: key,
                Body: fileData.buffer,
                ContentType: fileType?.mime || 'image/png',
            };

            const upload = new Upload({ client: s3Client, params: putItem });
            await upload.done();

            paymentScreenshotKey = key;
            console.log(`Payment screenshot uploaded to S3: ${key}`);
        }

        // Save attendee data to DynamoDB
        const attendeeItem = {
            pk: `${formData.eventSlug}#ATTENDEE`,
            sk: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            eventSlug: formData.eventSlug,
            eventType: formData.eventType,
            paymentScreenshotKey,
            attendanceStatus: "PENDING",
            registrationDate: new Date().toISOString(),
            registrationType: "self-service", // Field to identify self-service registration
        };

        await ddbDocClient.send(
            new PutCommand({
                TableName,
                Item: attendeeItem,
            }),
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                status: "OK",
                message: "Registration successful",
                paymentScreenshotKey,
                attendeeId: formData.email,
                registrationType: "self-service",
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

const parseFormData = (
    body: Buffer,
    contentType: string,
): Promise<{
    formData: Record<string, string>;
    fileData?: { buffer: Buffer; originalName: string };
} | null> => {
    return new Promise((resolve, reject) => {
        const busboy = Busboy({ headers: { "content-type": contentType } });
        const formData: Record<string, string> = {};
        let fileData: { buffer: Buffer; originalName: string } | undefined;
        const fileBuffer: Buffer[] = [];

        busboy.on("field", (fieldname, value) => {
            formData[fieldname] = value;
        });

        busboy.on("file", (fieldname, file, info) => {
            if (fieldname === "paymentScreenshot") {
                const { filename } = info;
                file.on("data", (data) => fileBuffer.push(data));
                file.on("end", () => {
                    if (fileBuffer.length > 0) {
                        fileData = {
                            buffer: Buffer.concat(fileBuffer),
                            originalName: filename
                        };
                    }
                });
            } else {
                // Skip other files
                file.resume();
            }
        });

        busboy.on("finish", () => {
            resolve({ formData, fileData });
        });

        busboy.on("error", (err) => reject(err));
        busboy.end(body);
    });
};
