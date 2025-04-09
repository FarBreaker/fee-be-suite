/** @format */

import { Construct } from "constructs";
import { EnvironmentConfig } from "../lib/configs/config-loader";
import { CfnOutput, RemovalPolicy, Stack } from "aws-cdk-lib";
import { AttributeType, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { NagSuppressions } from "cdk-nag";

export class StatefulStack extends Stack {
	public Table: TableV2;
	public Bucket: Bucket;
	constructor(scope: Construct, id: string, props: EnvironmentConfig) {
		super(scope, id, props);

		const { persistance, compute } = props;

		this.Bucket = new Bucket(this, `${props?.prefix}-bucket`, {
			enforceSSL: true,
			bucketName: persistance.bucket.name,
			removalPolicy: persistance.bucket.removalPolicy,
			autoDeleteObjects: persistance.bucket.autoDeleteObjects,
		});

		this.Table = new TableV2(this, `${props?.prefix}-dynamo`, {
			tableName: persistance.table.name,
			partitionKey: { name: "pk", type: AttributeType.STRING },
			sortKey: { name: "sk", type: AttributeType.STRING },
			removalPolicy: persistance.table.removalPolicy,
		});

		new CfnOutput(this, "TableName", {
			value: this.Table.tableName,
			description: "The name of the dynamo table",
			exportName: `TableName-${props?.prefix}`,
		});
		new CfnOutput(this, "BucketName", {
			value: this.Bucket.bucketName,
			description: "The name of the bucket",
			exportName: `BucketName-${props?.prefix}`,
		});
	}
}
