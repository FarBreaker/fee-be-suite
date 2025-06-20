/** @format */

import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import {
	HttpLambdaAuthorizer,
	HttpUserPoolAuthorizer,
} from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import {
	type IUserPool,
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
import {
	IdentityPool,
	UserPoolAuthenticationProvider,
} from "aws-cdk-lib/aws-cognito-identitypool";
import { type ITableV2, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { FederatedPrincipal, Role } from "aws-cdk-lib/aws-iam";
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
								methods: [HttpMethod.GET],
								path: "/getEventDetails/{eventType}/{eventId}",
								integration: GetEventDetailsFunction.integration,
							},
							{
								methods: [HttpMethod.GET],
								path: "/getEventList/{eventType}",
								integration: GetEventListFunction.integration,
							},
							{
								methods: [HttpMethod.POST],
								path: "/createEvent/{eventType}",
								integration: CreateEventFunction.integration,
								authorizer: cognitoAuth,
							},
							{
								methods: [HttpMethod.POST],
								path: "/deleteEvent/{eventType}",
								integration: DeleteEventFunction.integration,
								authorizer: cognitoAuth,
							},
							{
								methods: [HttpMethod.PUT],
								path: "/uploadFile",
								integration: PutS3ObjectFunction.integration,
								authorizer: cognitoAuth,
							},
							{
								methods: [HttpMethod.GET],
								path: "/listFiles",
								integration: ListS3ObjectFunction.integration,
								authorizer: cognitoAuth,
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
		this.bucket.grantRead(ListS3ObjectFunction.function);
	}
}
