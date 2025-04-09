#!/usr/bin/env node
/** @format */

import "source-map-support/register";
import { StatefulStack } from "../stateful/stateful-stack";
import { StatelessStack } from "../stateless/stateless-stack";
import { Aspects, App, Tags } from "aws-cdk-lib";
import { LambdaRule } from "../lib/aspects/LambdaRule";
import { loadConfig } from "../lib/configs/config-loader";
import { getTags } from "../lib/constants/tags";

const app = new App();
const env = app.node.tryGetContext("env") || "dev";
const config = loadConfig(env);
const tags = getTags(env);

Object.entries(tags).forEach(([key, value]) => {
	Tags.of(app).add(key, value);
});

Aspects.of(app).add(new LambdaRule());

const statefulStack = new StatefulStack(app, `${config.prefix}-stateful`, {
	...config,
});
const statelessStack = new StatelessStack(app, `${config.prefix}-stateless`, {
	...config,
});

statelessStack.addDependency(statefulStack);

app.synth();
