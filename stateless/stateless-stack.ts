/** @format */

import { Construct } from "constructs";
import { EnvironmentConfig } from "../lib/configs/config-loader";
import { Duration, Stack } from "aws-cdk-lib";
import { EnhancedLambda, LambdaProfile } from "../lib/constructs/NodeFunction";
import { Bucket, IBucket } from "aws-cdk-lib/aws-s3";
import { Gateway } from "../lib/constructs/Gateway";
import { HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";

export class StatelessStack extends Stack {
	private bucket: IBucket;
	constructor(scope: Construct, id: string, props: EnvironmentConfig) {
		super(scope, id, props);

		const { persistance, compute, network } = props;

		this.bucket = Bucket.fromBucketName(
			this,
			`${props.prefix}-reboundBucket`,
			persistance.bucket.name
		);

		const lambdaTestLLRT = new EnhancedLambda(
			this,
			`${props?.prefix}-llrt-lambda`,
			{
				lambdaDefinition: "llrt-lambda",
				entry: "./stateless/functions/test/index.ts",
				profile: compute.lambda.profile,
				timeout: Duration.minutes(3),
				httpIntegration: true,
				environment: {
					BUCKET_NAME: this.bucket.bucketName,
				},
				handler: "index.testFunction",
			}
		);
		const lambdaTestNODE = new EnhancedLambda(
			this,
			`${props?.prefix}-node-lambda`,
			{
				lambdaDefinition: "node-lambda",
				entry: "./stateless/functions/test/index.ts",
				profile: LambdaProfile.COMPATIBILITY,
				timeout: Duration.minutes(3),
				environment: {
					BUCKET_NAME: this.bucket.bucketName,
				},
				handler: "index.testFunction",
			}
		);

		const httpEndpoint = new Gateway(this, `${props.prefix}-gateway`, {
			corsPreflight: network.apigw?.corsPreflight,
			routeGroups: [
				{
					apiVersion: "v1",
					routes: [
						{
							methods: [HttpMethod.GET],
							path: "/demo",
							integration: lambdaTestLLRT.integration,
						},
					],
				},
			],
		});

		this.bucket.grantReadWrite(lambdaTestLLRT.function);
		this.bucket.grantReadWrite(lambdaTestNODE.function);
	}
}
