<!-- @format -->

# CDK Symphony

A collection of pre-configured AWS CDK constructs and templates designed to accelerate cloud infrastructure development with best practices and common patterns.

## Overview

This project provides enhanced CDK constructs with simplified configuration and additional functionality built on top of AWS CDK's standard constructs. It includes pre-configured templates for common architectures and custom constructs that reduce boilerplate and enforce best practices.

## Features

### Custom Constructs

#### 🚀 Enhanced Lambda Construct

A flexible Lambda function construct that supports:

- Dual runtime environment (Node.js 20.x and LLRT)
- TypeScript support out of the box
- ESBuild enabled
- Automatic HTTP integration with API Gateway
- Simplified configuration with smart defaults

```typescript
const MyLambda = new EnhancedLambda(this, `${props?.prefix}-llrt-lambda`, {
	lambdaDefinition: "llrt-lambda",
	entry: "./stateless/functions/test/index.ts",
	profile: LambdaProfile.COMPATIBILITY || LambdaProfile.PERFORMANCE,
	timeout: Duration.minutes(3),
	httpIntegration: true, //This enables httpintegration generation
	environment: {
		BUCKET_NAME: this.bucket.bucketName,
	},
	handler: "index.testFunction",
});
```

#### 🌐 API Gateway Construct

A pre-configured API Gateway construct with:

- Simplified route configuration
- Built-in CORS support
- Easy integration with Enhanced Lambda functions
- Common middleware patterns

```typescript
const api = new EnhancedApiGateway(this, "MyApi", {
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
```

#### 📦 Static Website Bucket

An S3 bucket pre-configured for static website hosting with:

- Website hosting enabled
- Proper public access configuration
- Default index and error documents
- Optional CloudFront distribution

```typescript
const website = new StaticWebsiteBucket(this, "MyWebsite", {
	indexDocument: "index.html",
	errorDocument: "error.html",
	enableCloudFront: true,
});
```

## Installation

Simply generate a new repository from this and run:

```bash
npm i
```

If you have Volta installed in you system the cli will automatically default to the current node version that i'm using for the project

## Usage

Edit all the files you need to fit your project needs

## Contributing

Contributions are welcome!

## License

This project is licensed under the MIT License - see the [LICENSE](https://us-east-1.console.aws.amazon.com/bedrock/LICENSE) file for details.

## Acknowledgments

- AWS CDK team for the amazing framework
- LLRT team for the innovative runtime
