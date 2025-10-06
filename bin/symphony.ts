/** @format */

import "source-map-support/register.js";
import { App, Aspects, Tags } from "aws-cdk-lib";
import { LambdaRule } from "../lib/Aspects/LambdaRule";
import { loadConfig } from "../lib/configs/config-loader";
import { getTags } from "../lib/constants/tags";
import { StatefulStack } from "../stateful/stateful-stack";
import { StatelessStack } from "../stateless/stateless-stack";

const app = new App();
const env = app.node.tryGetContext("env") || "dev";
const config = loadConfig(env);
const tags = getTags(env);

for (const [key, value] of Object.entries(tags)) {
	Tags.of(app).add(key, value);
}
Aspects.of(app).add(new LambdaRule());

const statefulStack = new StatefulStack(
	app,
	`${config.prefix}-stateful-${config.env.stage}`,
	{
		...config,
	},
);
const statelessStack = new StatelessStack(
	app,
	`${config.prefix}-stateless-${config.env.stage}`,
	{
		...config,
	},
);

statelessStack.addDependency(statefulStack);

app.synth();
