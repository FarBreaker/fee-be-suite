/** @format */

import { CfnOutput, RemovalPolicy, Stack } from "aws-cdk-lib";

import {
	CloudFrontWebDistribution,
	Distribution,
	OriginAccessControlBase,
	OriginAccessIdentity,
	OriginBase,
} from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { AttributeType, TableV2, StreamViewType } from "aws-cdk-lib/aws-dynamodb";
import { Bucket, type CorsRule, HttpMethods } from "aws-cdk-lib/aws-s3";
import { NagSuppressions } from "cdk-nag";
import type { Construct } from "constructs";
import type { EnvironmentConfig } from "../lib/configs/config-loader";

export class StatefulStack extends Stack {
	public Table: TableV2;
	public Bucket: Bucket;
	constructor(scope: Construct, id: string, props: EnvironmentConfig) {
		super(scope, id, props);

		const { persistance, compute } = props;
		const { bucket, table } = persistance;

		const assetsBucketCors: CorsRule = {
			allowedOrigins: ["*"],
			allowedMethods: [HttpMethods.GET],
			allowedHeaders: ["*"],
		};

		this.Bucket = new Bucket(
			this,
			`${props?.prefix}-bucket-${props.env.stage}`,
			{
				enforceSSL: true,
				cors: [assetsBucketCors],

				...bucket,
			},
		);
		const updaterBucket = new Bucket(this, "UpdaterBucket", {
			enforceSSL: true,
			cors: [assetsBucketCors],
			...bucket,
			bucketName: `appassets${props.env.stage}`,
		});
		const originAccessIdentity = new OriginAccessIdentity(
			this,
			`${props.prefix}-oai-${props.env.stage}`,
		);

		const assetDist = new Distribution(
			this,
			`${props.prefix}-assetDist-${props.env.stage}`,
			{
				defaultBehavior: {
					origin: S3BucketOrigin.withOriginAccessIdentity(this.Bucket, {
						originAccessIdentity,
					}),
				},
				additionalBehaviors: {
					"/updater/*": {
						origin: S3BucketOrigin.withOriginAccessIdentity(updaterBucket, {
							originAccessIdentity,
						}),
					},
				},
			},
		);

		this.Table = new TableV2(
			this,
			`${props?.prefix}-dynamo-${props.env.stage}`,
			{
				partitionKey: { name: "pk", type: AttributeType.STRING },
				sortKey: { name: "sk", type: AttributeType.STRING },
				dynamoStream: StreamViewType.NEW_AND_OLD_IMAGES, // Enable streams for attendee counter updates
				...table,
			},
		);

		new CfnOutput(this, "TableName", {
			value: this.Table.tableName,
			description: "The name of the dynamo table",
			exportName: `${props.prefix}-TableName-${props?.env.stage}`,
		});
		new CfnOutput(this, "TableStreamArn", {
			value: this.Table.tableStreamArn || "",
			description: "The ARN of the dynamo table stream",
			exportName: `${props.prefix}-TableStreamArn-${props?.env.stage}`,
		});
		new CfnOutput(this, "BucketName", {
			value: this.Bucket.bucketName,
			description: "The name of the bucket",
			exportName: `${props.prefix}-BucketName-${props?.env.stage}`,
		});
	}
}
