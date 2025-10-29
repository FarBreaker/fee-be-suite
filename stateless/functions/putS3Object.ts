import { type PutObjectCommandInput, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import Busboy from "busboy";
import { fileTypeFromBuffer } from "file-type";

const BucketName = process.env.BUCKET_NAME;
const region = process.env.REGION;

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	const client = new S3Client({ region });

	try {
		const contentType =
			event.headers["content-type"] || event.headers["Content-Type"];
		if (!event.body || !event.isBase64Encoded || !contentType) {
			throw new Error("Invalid input");
		}

		const bodyBuffer = Buffer.from(event.body, "base64");

		const parsed = await parseForm(bodyBuffer, contentType);
		if (!parsed) throw new Error("No file found");

		const { buffer, originalName } = parsed;

		const fileType = await fileTypeFromBuffer(buffer);
		const extension =
			fileType?.ext || getExtensionFromName(originalName) || "bin";
		const mime = fileType?.mime || "application/octet-stream";

		// Sanitize and fallback
		const safeName = sanitizeFileName(originalName) || `upload.${extension}`;

		const Key = safeName;

		const putItem: PutObjectCommandInput = {
			Bucket: BucketName,
			Key,
			Body: buffer,
			ContentType: mime,
		};

		const res = new Upload({ client, params: putItem });
		await res.done();

		return {
			statusCode: 200,
			body: JSON.stringify({
				status: "OK",
				url: `https://d2c2kb9p4hnpz.cloudfront.net/${Key}`,
			}),
		};
	} catch (error) {
		console.error("Error: ", error);
		return {
			statusCode: 400,
			body: JSON.stringify({
				status: "Error",
				message: (error as Error).message,
			}),
		};
	}
};

const parseForm = (
	body: Buffer,
	contentType: string,
): Promise<{ buffer: Buffer; originalName: string } | null> => {
	return new Promise((resolve, reject) => {
		const busboy = Busboy({ headers: { "content-type": contentType } });
		const fileBuffer: Buffer[] = [];
		let originalName = "";

		busboy.on("file", (_fieldname, file, info) => {
			const { filename } = info;
			originalName = filename;
			file.on("data", (data) => fileBuffer.push(data));
		});

		busboy.on("finish", () => {
			if (!fileBuffer.length) return resolve(null);
			resolve({ buffer: Buffer.concat(fileBuffer), originalName });
		});

		busboy.on("error", (err) => reject(err));
		busboy.end(body);
	});
};

const getExtensionFromName = (name: string): string | null => {
	const parts = name.split(".");
	return parts.length > 1 ? parts.pop() || null : null;
};

const sanitizeFileName = (name: string): string => {
	return name
		.replace(/^.*[\\/]/, "") // Remove path
		.replace(/[^\w.-]/g, "_") // Replace unsafe chars
		.toLowerCase();
};
