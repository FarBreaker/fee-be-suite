/** @format */

import { Duration, Stack } from "aws-cdk-lib";
import { HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { type ITableV2, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { Bucket, type IBucket } from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import type { EnvironmentConfig } from "../lib/configs/config-loader";
import { Gateway } from "../lib/constructs/Gateway";
import { EnhancedLambda, LambdaProfile } from "../lib/constructs/NodeFunction";

export class StatelessStack extends Stack {
	private bucket: IBucket;
	private table: ITableV2;
	constructor(scope: Construct, id: string, props: EnvironmentConfig) {
		super(scope, id, props);

		const { persistance, compute, network } = props;

		this.bucket = Bucket.fromBucketName(
			this,
			`${props.prefix}-reboundBucket`,
			persistance.bucket.bucketName,
		);
		this.table = TableV2.fromTableName(
			this,
			`${props.prefix}-reboundTable`,
			persistance.table.tableName,
		);

		const CreateEventFunction = new EnhancedLambda(
			this,
			`${props?.prefix}-createEvent`,
			{
				lambdaDefinition: "create-event-function",
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
			`${props?.prefix}-getEventList`,
			{
				lambdaDefinition: "get-event-list-function",
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

		const httpEndpoint = new Gateway(this, `${props.prefix}-gateway`, {
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
					],
				},
			],
		});
		this.table.grantWriteData(CreateEventFunction.function);
		this.table.grantReadData(GetEventListFunction.function);
	}
}
