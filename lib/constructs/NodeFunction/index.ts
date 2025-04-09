/** @format */

import { IFunction, Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { CfnResource, Duration } from "aws-cdk-lib";
import { Architecture } from "aws-cdk-lib/aws-lambda";
import {
	NodejsFunction,
	NodejsFunctionProps,
	OutputFormat,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";

/**
 * Enum representing the Lambda function profile type
 * @enum {string}
 * @property {string} PERFORMANCE - Profile optimized for performance using LLRT runtime
 * @property {string} COMPATIBILITY - Profile using standard Node.js runtime for compatibility
 */
export const enum LambdaProfile {
	PERFORMANCE = "performance",
	COMPATIBILITY = "compatibility",
}

interface BundleFunctionProps
	extends Pick<
		NodejsFunctionProps,
		"entry" | "environment" | "handler" | "timeout"
	> {
	/**
	 * The entry index
	 */
	entry: string;
	/**
	 * Lambda custom name
	 */
	lambdaDefinition: string;
	/**
	 * The Lambda profile that can either be PERFORMANCE or COMPATIBILITY
	 */
	profile: LambdaProfile;

	/**
	 * Handler string name
	 */
	handler: string;
	/**
	 * Environment Variables to be passed
	 */
	environment?: { [key: string]: string };
	/**
	 * Whether to enable http integration when true http is enabled and the integration is created
	@default false 
	*/
	httpIntegration?: boolean;
	/**
	 * Timeout in seconds
	 */
	timeout: Duration;
}
type FixedBundleFunctionProps = Omit<NodejsFunctionProps, "entry">;

/**
 * A Node.js Lambda Function bundled using esbuild, use it to deploy Node 20.x function with the compatibility mode or LLRT Latest function with performance mode
 */
export class EnhancedLambda extends Construct {
	public function: IFunction;
	public integration: HttpLambdaIntegration;
	constructor(scope: Construct, id: string, props: BundleFunctionProps) {
		super(scope, id);

		const fixedProps: FixedBundleFunctionProps = {
			memorySize: 1024,
			functionName: `${props.lambdaDefinition}-${props.profile}`,
			bundling: {
				banner:
					"import { createRequire } from 'module';const require = createRequire(import.meta.url);",
				minify: true,
				format: OutputFormat.ESM,
				esbuildArgs: {
					"--tree-shaking": true,
				},
				sourceMap: true,
				externalModules: ["@aws-sdk/*"],
			},
		};

		if (props.profile === LambdaProfile.PERFORMANCE) {
			this.function = new LLRTNodeFunction(
				this,
				`${props.profile}-${props.lambdaDefinition}`,
				{
					...props,
					functionName: `${props.lambdaDefinition}-${props.profile}`,
				}
			);
		} else {
			this.function = new NodejsFunction(
				this,
				`${props.profile}-${props.lambdaDefinition}`,
				{
					...props,
					...fixedProps,
					runtime: Runtime.NODEJS_20_X,
				}
			);
		}
		if (props.httpIntegration) {
			this.integration = new HttpLambdaIntegration(
				`${props.lambdaDefinition}-integration`,
				this.function
			);
		}
	}
}

export interface LlrtFunctionProps extends NodejsFunctionProps {
	/**
	 * The verson of LLRT. See https://github.com/awslabs/llrt/releases
	 *
	 * @default "latest"
	 */
	readonly llrtVersion?: string;
}

export class LLRTNodeFunction extends NodejsFunction {
	constructor(scope: Construct, id: string, props: LlrtFunctionProps) {
		const version = props.llrtVersion ?? "latest";
		const arch = props.architecture == Architecture.ARM_64 ? "arm64" : "x64";
		const binaryUrl =
			version == "latest"
				? `https://github.com/awslabs/llrt/releases/latest/download/llrt-lambda-${arch}.zip`
				: `https://github.com/awslabs/llrt/releases/download/${version}/llrt-lambda-${arch}.zip`;
		super(scope, id, {
			...props,
			memorySize: 1024,
			bundling: {
				esbuildArgs: {
					"--tree-shaking": true,
				},
				banner:
					"import { createRequire } from 'module';const require = createRequire(import.meta.url);",
				target: "es2020",
				format: OutputFormat.ESM,
				minify: true,
				commandHooks: {
					beforeBundling: (_i, _o) => [],
					afterBundling: (i, o) => [
						// Download llrt binary from GitHub release and cache it
						`if [ ! -e ${i}/.tmp/${arch}/bootstrap ]; then
            mkdir -p ${i}/.tmp/${arch}
            cd ${i}/.tmp/${arch}
            curl -L -o llrt_temp.zip ${binaryUrl}
            unzip llrt_temp.zip
            rm -rf llrt_temp.zip
            fi`,
						`cp ${i}/.tmp/${arch}/bootstrap ${o}/`,
					],
					beforeInstall: (_i, _o) => [],
				},
				// Dependencies bundled in the runtime
				// https://github.com/awslabs/llrt?tab=readme-ov-file#using-aws-sdk-v3-with-llrt
				externalModules: [
					"@aws-sdk/client-dynamodb",
					"@aws-sdk/lib-dynamodb",
					"@aws-sdk/client-kms",
					"@aws-sdk/client-lambda",
					"@aws-sdk/client-s3",
					"@aws-sdk/client-secrets-manager",
					"@aws-sdk/client-ses",
					"@aws-sdk/client-sns",
					"@aws-sdk/client-sqs",
					"@aws-sdk/client-sts",
					"@aws-sdk/client-ssm",
					"@aws-sdk/client-cloudwatch-logs",
					"@aws-sdk/client-cloudwatch-events",
					"@aws-sdk/client-eventbridge",
					"@aws-sdk/client-sfn",
					"@aws-sdk/client-xray",
					"@aws-sdk/client-cognito-identity",
					"@aws-sdk/util-dynamodb",
					"@aws-sdk/credential-providers",
					"@smithy/signature-v4",
				],
				...props.bundling,
			},
		});

		(this.node.defaultChild as CfnResource).addPropertyOverride(
			"Runtime",
			"provided.al2023"
		);
	}
}
