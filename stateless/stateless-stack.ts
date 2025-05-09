/** @format */

import { Duration, Stack } from "aws-cdk-lib";
import { HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpUserPoolAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { type IUserPool, UserPool } from "aws-cdk-lib/aws-cognito";
import { type ITableV2, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { Bucket, type IBucket } from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import type { EnvironmentConfig } from "../lib/configs/config-loader";
import { Gateway } from "../lib/constructs/Gateway";
import { EnhancedLambda, LambdaProfile } from "../lib/constructs/NodeFunction";

interface StatelessEnv extends EnvironmentConfig {}

export class StatelessStack extends Stack {
	private bucket: IBucket;
	private table: ITableV2;
	constructor(scope: Construct, id: string, props: StatelessEnv) {
		super(scope, id, props);

		const { persistance, compute, network } = props;

		this.bucket = Bucket.fromBucketName(
			this,
			`${props.prefix}-reboundBucket-${props.env.stage}`,
			persistance.bucket.bucketName,
		);
		this.table = TableV2.fromTableName(
			this,
			`${props.prefix}-reboundTable-${props.env.stage}`,
			persistance.table.tableName,
		);

		const CreateEventFunction = new EnhancedLambda(
			this,
			`${props?.prefix}-createEvent-${props.env.stage}`,
			{
				lambdaDefinition: `${props?.prefix}-createEvent-${props.env.stage}`,
				entry: "./stateless/functions/createEvent.ts",
				profile: compute.lambda.profile,
				timeout: Duration.minutes(3),
				httpIntegration: true,
				environment: {
					TABLE_NAME: this.table.tableName,
				},
				handler: "handler",
			},
		);
		const GetEventListFunction = new EnhancedLambda(
			this,
			`${props?.prefix}-getEventList-${props.env.stage}`,
			{
				lambdaDefinition: `${props?.prefix}-getEventList-${props.env.stage}`,
				entry: "./stateless/functions/getEventList.ts",
				profile: compute.lambda.profile,
				timeout: Duration.minutes(3),
				httpIntegration: true,
				environment: {
					TABLE_NAME: this.table.tableName,
				},
				handler: "handler",
			},
		);
		const DeleteEventFunction = new EnhancedLambda(
			this,
			`${props?.prefix}-deleteEvent-${props.env.stage}`,
			{
				lambdaDefinition: `${props?.prefix}-deleteEvent-${props.env.stage}`,
				entry: "./stateless/functions/deleteEvents.ts",
				profile: compute.lambda.profile,
				timeout: Duration.minutes(3),
				httpIntegration: true,
				environment: {
					TABLE_NAME: this.table.tableName,
				},
				handler: "handler",
			},
		);
		const GetEventDetailsFunction = new EnhancedLambda(
			this,
			`${props?.prefix}-getEventDetails-${props.env.stage}`,
			{
				lambdaDefinition: `${props?.prefix}-getEventDetails-${props.env.stage}`,
				entry: "./stateless/functions/getEventDetails.ts",
				profile: compute.lambda.profile,
				timeout: Duration.minutes(3),
				httpIntegration: true,
				environment: {
					TABLE_NAME: this.table.tableName,
				},
				handler: "handler",
			},
		);
		const PutS3ObjectFunction = new EnhancedLambda(
			this,
			`${props?.prefix}-putS3Object-${props.env.stage}`,
			{
				lambdaDefinition: `${props?.prefix}-putS3Object-${props.env.stage}`,
				entry: "./stateless/functions/putS3Object.ts",
				profile: LambdaProfile.COMPATIBILITY,
				timeout: Duration.minutes(3),
				httpIntegration: true,
				environment: {
					BUCKET_NAME: this.bucket.bucketName,
					REGION: props.env.region ?? "eu-central-1",
				},
				handler: "handler",
			},
		);
		const httpEndpoint = new Gateway(
			this,
			`${props.prefix}-gateway-${props.env.stage}`,
			{
				corsPreflight: network.apigw?.corsPreflight,
				routeGroups: [
					{
						apiVersion: "v1",
						routes: [
							{
								methods: [HttpMethod.POST],
								path: "/createEvent/{eventType}",
								integration: CreateEventFunction.integration,
							},
							{
								methods: [HttpMethod.GET],
								path: "/getEventList/{eventType}",
								integration: GetEventListFunction.integration,
							},
							{
								methods: [HttpMethod.POST],
								path: "/deleteEvent/{eventType}",
								integration: DeleteEventFunction.integration,
							},
							{
								methods: [HttpMethod.GET],
								path: "/getEventDetails/{eventType}/{eventId}",
								integration: GetEventDetailsFunction.integration,
							},
							{
								methods: [HttpMethod.PUT],
								path: "/uploadFile",
								integration: PutS3ObjectFunction.integration,
							},
						],
					},
				],
			},
		);
		this.table.grantWriteData(CreateEventFunction.function);
		this.table.grantWriteData(DeleteEventFunction.function);
		this.table.grantReadData(GetEventListFunction.function);
		this.table.grantReadData(GetEventDetailsFunction.function);
		this.bucket.grantWrite(PutS3ObjectFunction.function);
	}
}
