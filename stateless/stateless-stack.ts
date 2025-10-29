/** @format */

import { Duration, RemovalPolicy, Stack, CfnOutput } from "aws-cdk-lib";
import { HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpUserPoolAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import {
	ManagedLoginVersion,
	OAuthScope,
	ProviderAttribute,
	UserPool,
	UserPoolClient,
	UserPoolClientIdentityProvider,
	UserPoolDomain,
	UserPoolIdentityProviderSaml,
	UserPoolIdentityProviderSamlMetadata,
} from "aws-cdk-lib/aws-cognito";

import { type ITableV2, TableV2 } from "aws-cdk-lib/aws-dynamodb";

import { CfnEventSourceMapping } from "aws-cdk-lib/aws-lambda";
import { Fn } from "aws-cdk-lib";
import { Bucket, type IBucket } from "aws-cdk-lib/aws-s3";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
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
		const ListS3ObjectFunction = new EnhancedLambda(this, "listS3Object", {
			lambdaDefinition: "listS3Object",
			entry: "./stateless/functions/listS3Objects.ts",
			profile: LambdaProfile.PERFORMANCE,
			timeout: Duration.minutes(3),
			httpIntegration: true,
			environment: {
				BUCKET_NAME: this.bucket.bucketName,
				REGION: props.env.region ?? "eu-central-1",
			},
			handler: "handler",
		});
		const EventRegistrationFunction = new EnhancedLambda(
			this,
			"eventRegistration",
			{
				lambdaDefinition: "eventRegistration",
				entry: "./stateless/functions/eventRegistration.ts",
				profile: LambdaProfile.COMPATIBILITY,
				timeout: Duration.minutes(3),
				httpIntegration: true,
				environment: {
					BUCKET_NAME: this.bucket.bucketName,
					REGION: props.env.region ?? "eu-central-1",
					TABLE_NAME: this.table.tableName,
				},
				handler: "handler",
			},
		);
		const GetEventAttendeesFunction = new EnhancedLambda(
			this,
			"getEventAttendees",
			{
				lambdaDefinition: "getEventAttendees",
				entry: "./stateless/functions/getEventAttendees.ts",
				profile: LambdaProfile.PERFORMANCE,
				timeout: Duration.minutes(3),
				httpIntegration: true,
				environment: {
					TABLE_NAME: this.table.tableName,
					REGION: props.env.region ?? "eu-central-1",
				},
				handler: "handler",
			},
		);
		const ManualAttendeeRegistrationFunction = new EnhancedLambda(
			this,
			"manualAttendeeRegistration",
			{
				lambdaDefinition: "manualAttendeeRegistration",
				entry: "./stateless/functions/manualAttendeeRegistration.ts",
				profile: LambdaProfile.PERFORMANCE,
				timeout: Duration.minutes(3),
				httpIntegration: true,
				environment: {
					TABLE_NAME: this.table.tableName,
					REGION: props.env.region ?? "eu-central-1",
				},
				handler: "handler",
			},
		);
		const UploadQuizToS3Function = new EnhancedLambda(this, "uploadQuizToS3", {
			lambdaDefinition: "uploadQuizToS3",
			entry: "./stateless/functions/uploadQuizToS3.ts",
			profile: LambdaProfile.PERFORMANCE,
			timeout: Duration.minutes(3),
			httpIntegration: true,
			environment: {
				BUCKET_NAME: this.bucket.bucketName,
				REGION: props.env.region ?? "eu-central-1",
			},
			handler: "handler",
		});
		const GetQuizFromS3Function = new EnhancedLambda(this, "getQuizFromS3", {
			lambdaDefinition: "getQuizFromS3",
			entry: "./stateless/functions/getQuizFromS3.ts",
			profile: LambdaProfile.COMPATIBILITY,
			timeout: Duration.minutes(3),
			httpIntegration: true,
			environment: {
				BUCKET_NAME: this.bucket.bucketName,
				REGION: props.env.region ?? "eu-central-1",
			},
			handler: "handler",
		});
		const DeleteAttendeeFunction = new EnhancedLambda(this, "deleteAttendee", {
			lambdaDefinition: "deleteAttendee",
			entry: "./stateless/functions/deleteAttendee.ts",
			profile: LambdaProfile.PERFORMANCE,
			timeout: Duration.minutes(3),
			httpIntegration: true,
			environment: {
				TABLE_NAME: this.table.tableName,
				REGION: props.env.region ?? "eu-central-1",
			},
			handler: "handler",
		});
		const UpdateAttendeeDetailsFunction = new EnhancedLambda(
			this,
			"updateAttendeeDetails",
			{
				lambdaDefinition: "updateAttendeeDetails",
				entry: "./stateless/functions/updateAttendeeDetails.ts",
				profile: LambdaProfile.PERFORMANCE,
				timeout: Duration.minutes(3),
				httpIntegration: true,
				environment: {
					TABLE_NAME: this.table.tableName,
					REGION: props.env.region ?? "eu-central-1",
				},
				handler: "handler",
			},
		);
		const UpdateAttendeeStatusFunction = new EnhancedLambda(
			this,
			"updateAttendeeStatus",
			{
				lambdaDefinition: "updateAttendeeStatus",
				entry: "./stateless/functions/updateAttendeeStatus.ts",
				profile: LambdaProfile.PERFORMANCE,
				timeout: Duration.minutes(3),
				httpIntegration: true,
				environment: {
					TABLE_NAME: this.table.tableName,
					REGION: props.env.region ?? "eu-central-1",
				},
				handler: "handler",
			},
		);
		const UpdateEventFunction = new EnhancedLambda(this, "updateEvent", {
			lambdaDefinition: "updateEvent",
			entry: "./stateless/functions/updateEvent.ts",
			profile: LambdaProfile.PERFORMANCE,
			timeout: Duration.minutes(3),
			httpIntegration: true,
			environment: {
				TABLE_NAME: this.table.tableName,
				REGION: props.env.region ?? "eu-central-1",
			},
			handler: "handler",
		});

		const userPool = new UserPool(this, "UserPool", {
			userPoolName: "testing-entra-dev",
			removalPolicy: RemovalPolicy.DESTROY,
		});
		const IDPClient = new UserPoolIdentityProviderSaml(this, "IDPClient", {
			userPool,
			metadata: UserPoolIdentityProviderSamlMetadata.url(
				"https://login.microsoftonline.com/ef955172-90d2-4df0-8e52-b0619e51510d/federationmetadata/2007-06/federationmetadata.xml?appid=83c1a495-57c8-49f8-b62d-f328891f43ae",
			),
			name: "ENTRA-FEDERATED",
			attributeMapping: {
				email: ProviderAttribute.other(
					"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
				),
				givenName: ProviderAttribute.other(
					"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
				),
				familyName: ProviderAttribute.other(
					"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
				),
				fullname: ProviderAttribute.other(
					"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
				),
			},
		});
		const cognitoClient = new UserPoolClient(this, "CognitoClient", {
			userPool,
			userPoolClientName: "ENTRA-FEDERATED-DEV",
			supportedIdentityProviders: [
				UserPoolClientIdentityProvider.custom("ENTRA-FEDERATED"),
			],
			generateSecret: false,
			oAuth: {
				callbackUrls: ["http://localhost:1421/"],
				logoutUrls: ["http://localhost:1421/"],
				flows: {
					authorizationCodeGrant: true,
				},
				scopes: [OAuthScope.OPENID, OAuthScope.EMAIL, OAuthScope.PROFILE],
			},
		});
		const cognitoDomain = new UserPoolDomain(this, "CognitoDomain", {
			userPool,
			cognitoDomain: {
				domainPrefix: "feesaml-dev",
			},
			managedLoginVersion: ManagedLoginVersion.CLASSIC_HOSTED_UI,
		});
		const cognitoAuth = new HttpUserPoolAuthorizer(
			"UserPoolAuthorizer",
			userPool,
			{
				userPoolClients: [cognitoClient],
			},
		);

		// Optimized Lambda functions for better performance
		const GetEventListOptimizedFunction = new EnhancedLambda(
			this,
			"getEventListOptimized",
			{
				lambdaDefinition: "getEventListOptimized",
				entry: "./stateless/functions/getEventListOptimized.ts",
				profile: LambdaProfile.PERFORMANCE,
				timeout: Duration.seconds(10),
				httpIntegration: true,
				environment: {
					TABLE_NAME: this.table.tableName,
					REGION: props.env.region ?? "eu-central-1",
				},
				handler: "handler",
			},
		);
		const GetEventDetailsOptimizedFunction = new EnhancedLambda(
			this,
			"getEventDetailsOptimized",
			{
				lambdaDefinition: "getEventDetailsOptimized",
				entry: "./stateless/functions/getEventDetailsOptimized.ts",
				profile: LambdaProfile.PERFORMANCE,
				timeout: Duration.seconds(10),
				httpIntegration: true,
				environment: {
					TABLE_NAME: this.table.tableName,
					REGION: props.env.region ?? "eu-central-1",
				},
				handler: "handler",
			},
		);
		const UpdateAttendeeCounterFunction = new EnhancedLambda(
			this,
			"updateAttendeeCounter",
			{
				lambdaDefinition: "updateAttendeeCounter",
				entry: "./stateless/functions/updateAttendeeCounter.ts",
				profile: LambdaProfile.PERFORMANCE,
				timeout: Duration.minutes(1),
				httpIntegration: false, // This is a stream handler, not HTTP
				environment: {
					TABLE_NAME: this.table.tableName,
					REGION: props.env.region ?? "eu-central-1",
				},
				handler: "handler",
			},
		);

		// Configure DynamoDB Stream trigger using imported stream ARN
		const tableStreamArn = Fn.importValue(
			`${props.prefix}-TableStreamArn-${props?.env.stage}`,
		);

		// Create event source mapping directly using CloudFormation
		new CfnEventSourceMapping(this, "AttendeeCounterEventSourceMapping", {
			eventSourceArn: tableStreamArn,
			functionName: UpdateAttendeeCounterFunction.function.functionName,
			startingPosition: "LATEST",
			batchSize: 10,
			maximumBatchingWindowInSeconds: 5,
			maximumRetryAttempts: 3,
		});

		const httpEndpoint = new Gateway(
			this,
			`${props.prefix}-gateway-${props.env.stage}`,
			{
				corsPreflight: network.apigw?.corsPreflight,
				routeGroups: [
					{
						apiVersion: "v1",
						routes: [
							// Events Resource
							{
								methods: [HttpMethod.GET],
								path: "/events",
								integration: GetEventListOptimizedFunction.integration,
							},
							{
								methods: [HttpMethod.GET],
								path: "/events/{eventType}/{eventSlug}",
								integration: GetEventDetailsOptimizedFunction.integration,
							},
							{
								methods: [HttpMethod.POST],
								path: "/events/{eventType}",
								integration: CreateEventFunction.integration,
								authorizer: cognitoAuth,
							},
							{
								methods: [HttpMethod.DELETE],
								path: "/events/{eventType}/{eventSlug}",
								integration: DeleteEventFunction.integration,
								authorizer: cognitoAuth,
							},
							{
								methods: [HttpMethod.PUT],
								path: "/events/{eventType}/{eventSlug}",
								integration: UpdateEventFunction.integration,
								authorizer: cognitoAuth,
							},

							// Event Attendees Resource (nested under events)
							{
								methods: [HttpMethod.GET],
								path: "/events/{eventSlug}/attendees",
								integration: GetEventAttendeesFunction.integration,
								authorizer: cognitoAuth,
							},
							{
								methods: [HttpMethod.POST],
								path: "/events/{eventSlug}/attendees",
								integration: ManualAttendeeRegistrationFunction.integration,
								authorizer: cognitoAuth,
							},
							{
								methods: [HttpMethod.POST],
								path: "/events/{eventSlug}/attendees/register",
								integration: EventRegistrationFunction.integration,
							},
							{
								methods: [HttpMethod.DELETE],
								path: "/events/{eventSlug}/attendees/{attendeeId}",
								integration: DeleteAttendeeFunction.integration,
								authorizer: cognitoAuth,
							},
							{
								methods: [HttpMethod.PUT],
								path: "/events/{eventSlug}/attendees/{attendeeId}",
								integration: UpdateAttendeeDetailsFunction.integration,
								authorizer: cognitoAuth,
							},
							{
								methods: [HttpMethod.PATCH],
								path: "/events/{eventSlug}/attendees/{attendeeId}/verify",
								integration: UpdateAttendeeStatusFunction.integration,
								authorizer: cognitoAuth,
							},

							// Files Resource
							{
								methods: [HttpMethod.POST],
								path: "/files",
								integration: PutS3ObjectFunction.integration,
								authorizer: cognitoAuth,
							},
							{
								methods: [HttpMethod.GET],
								path: "/files",
								integration: ListS3ObjectFunction.integration,
								authorizer: cognitoAuth,
							},

							// Quiz Resource (standalone)
							{
								methods: [HttpMethod.POST],
								path: "/quiz/{eventSlug}",
								integration: UploadQuizToS3Function.integration,
								authorizer: cognitoAuth,
							},
							{
								methods: [HttpMethod.GET],
								path: "/quiz/{eventSlug}",
								integration: GetQuizFromS3Function.integration,
							},
						],
					},
				],
			},
		);

		//? Table Write
		this.table.grantWriteData(CreateEventFunction.function);
		this.table.grantWriteData(DeleteEventFunction.function);
		this.table.grantWriteData(EventRegistrationFunction.function);
		this.table.grantWriteData(ManualAttendeeRegistrationFunction.function);
		this.table.grantWriteData(DeleteAttendeeFunction.function);
		this.table.grantWriteData(UpdateAttendeeDetailsFunction.function);
		this.table.grantWriteData(UpdateAttendeeStatusFunction.function);
		this.table.grantWriteData(UpdateEventFunction.function);
		this.table.grantWriteData(UpdateAttendeeCounterFunction.function); // Stream handler needs write access

		//? Table Read
		this.table.grantReadData(GetEventListOptimizedFunction.function);
		this.table.grantReadData(GetEventDetailsOptimizedFunction.function);
		this.table.grantReadData(GetEventAttendeesFunction.function);
		this.table.grantReadData(DeleteAttendeeFunction.function);
		this.table.grantReadData(UpdateAttendeeDetailsFunction.function);
		this.table.grantReadData(UpdateAttendeeStatusFunction.function);
		this.table.grantReadData(UpdateEventFunction.function);
		this.table.grantReadData(UpdateAttendeeCounterFunction.function); // Stream handler needs read access

		//? DynamoDB Stream - Grant stream read permissions using IAM policy
		UpdateAttendeeCounterFunction.function.addToRolePolicy(
			new PolicyStatement({
				actions: [
					"dynamodb:DescribeStream",
					"dynamodb:GetRecords",
					"dynamodb:GetShardIterator",
					"dynamodb:ListStreams",
				],
				resources: [tableStreamArn],
			}),
		);

		//? Bucket Write
		this.bucket.grantWrite(PutS3ObjectFunction.function);
		this.bucket.grantWrite(EventRegistrationFunction.function);
		this.bucket.grantWrite(UploadQuizToS3Function.function);

		//? Bucket Read
		this.bucket.grantRead(ListS3ObjectFunction.function);
		this.bucket.grantRead(GetQuizFromS3Function.function);
	}
}
