/** @format */

/**
 * Import required dependencies for Lambda configuration
 */
import type { RemovalPolicy } from "aws-cdk-lib";
import type { CorsHttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import type { LambdaProfile } from "../constructs/NodeFunction/index";
import dev from "./dev.json" assert { type: "json" };
import prod from "./prod.json" assert { type: "json" };

/**
 * Environment configuration interface for account and region
 */
interface Env {
	account?: string;
	region?: string;
	stage: string;
}

/**
 * Main environment configuration interface
 */
export interface EnvironmentConfig {
	/** Prefix for resource naming */
	prefix: string;
	/** Environment settings */
	env: Env;
	/** Compute resource configurations */
	compute: ComputEnv;
	/** Storage resource configurations */
	persistance: PersistanceEnv;
	/** Network resource configurations */
	network: NetworkEnv;
}

/**
 * Compute environment configuration interface
 */
interface ComputEnv {
	/** Lambda function configurations */
	lambda: LambdaEnv;
}

/**
 * Lambda function environment configuration interface
 */
interface LambdaEnv {
	/** Lambda execution profile */
	profile: LambdaProfile;
	/** Function timeout in seconds */
	timeout: number;
}

/**
 * Persistence environment configuration interface
 */
interface PersistanceEnv {
	/** DynamoDB table configuration */
	table: TableEnv;
	/** S3 bucket configuration */
	bucket: BucketEnv;
}

/**
 * DynamoDB table configuration interface
 */
interface TableEnv {
	/** Table name */
	tableName: string;
	removalPolicy: RemovalPolicy;
}

/**
 * S3 bucket configuration interface
 */
interface BucketEnv {
	/** Bucket name */
	bucketName: string;
	removalPolicy: RemovalPolicy;
	autoDeleteObjects: boolean;
}

interface NetworkEnv {
	apigw?: ApiGwEnv;
}

interface ApiGwEnv {
	corsPreflight: {
		allowOrigins: string[];
		allowHeaders: string[];
		allowMethods: CorsHttpMethod[];
	};
}

/**
 * Loads environment specific configuration
 * @param env - Environment name ('dev' or 'prod')
 * @returns Environment configuration object
 * @throws Error if invalid environment specified
 */
export function loadConfig(env: string) {
	switch (env) {
		case "dev":
			return dev as EnvironmentConfig;
		case "prod":
			return prod as EnvironmentConfig;
		default:
			throw new Error(`Invalid environment:${env}`);
	}
}
