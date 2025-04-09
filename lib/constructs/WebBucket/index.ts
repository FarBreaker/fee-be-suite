/** @format */

import { RemovalPolicy } from "aws-cdk-lib";
import { OriginAccessIdentity } from "aws-cdk-lib/aws-cloudfront";
import { Bucket, BucketProps } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

interface WebBucketProps
	extends Pick<BucketProps, "removalPolicy" | "bucketName"> {
	/**
	 * The removal policy for the bucket
	 */
	removalPolicy: RemovalPolicy;
	/**
	 * The bucket name
	 */
	bucketName: string;
}

type FixedWebBucketProps = Omit<BucketProps, "removalPolicy" | "bucketName">;

export class WebBucket extends Construct {
	public readonly bucket: Bucket;
	public readonly originAccessIdentity: OriginAccessIdentity;

	constructor(scope: Construct, id: string, props: WebBucketProps) {
		super(scope, id);
		const fixedProps: FixedWebBucketProps = {
			websiteIndexDocument: "index.html",
			websiteErrorDocument: "index.html",
			enforceSSL: true,
			publicReadAccess: false,
			autoDeleteObjects: true,
			serverAccessLogsPrefix: "access-logs/",
			serverAccessLogsBucket: new Bucket(this, "WebBucketAccessLogs" + id, {
				autoDeleteObjects: true,
				removalPolicy: props.removalPolicy,
				bucketName: `${props.bucketName}-access-logs`,
			}),
		};

		this.bucket = new Bucket(this, id, {
			...fixedProps,
			...props,
		});
		this.originAccessIdentity = new OriginAccessIdentity(this, id + "OAI", {
			comment: `Origin Access Identity fro ${id} web bucket`,
		});
		this.bucket.grantRead(this.originAccessIdentity);
		this.bucket.applyRemovalPolicy(RemovalPolicy.DESTROY);
	}
}
