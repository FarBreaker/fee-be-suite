/** @format */

import { CfnOutput, RemovalPolicy, Stack } from "aws-cdk-lib";

import { AttributeType, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { Bucket } from "aws-cdk-lib/aws-s3";
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

		this.Bucket = new Bucket(
			this,
			`${props?.prefix}-bucket-${props.env.stage}`,
			{
				enforceSSL: true,
				...bucket,
			},
		);

		this.Table = new TableV2(
			this,
			`${props?.prefix}-dynamo-${props.env.stage}`,
			{
				partitionKey: { name: "pk", type: AttributeType.STRING },
				sortKey: { name: "sk", type: AttributeType.STRING },
				...table,
			},
		);

		new CfnOutput(this, "TableName", {
			value: this.Table.tableName,
			description: "The name of the dynamo table",
			exportName: `${props.prefix}-TableName-${props?.env.stage}`,
		});
		new CfnOutput(this, "BucketName", {
			value: this.Bucket.bucketName,
			description: "The name of the bucket",
			exportName: `${props.prefix}-BucketName-${props?.env.stage}`,
		});
	}
}
