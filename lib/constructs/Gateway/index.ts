/** @format */

import { CfnOutput } from "aws-cdk-lib";
import {
	HttpApi,
	HttpApiProps,
	HttpMethod,
	HttpRouteIntegration,
} from "aws-cdk-lib/aws-apigatewayv2";
import { Construct } from "constructs";

/**
 * Properties for configuring the API Gateway
 * @extends HttpApiProps from aws-cdk-lib/aws-apigatewayv2
 */
export interface GatewayProps extends HttpApiProps {
	/** Collection of route groups to be added to the API */
	routeGroups: RouteGroup[];
}

/**
 * Represents a group of related API routes with optional version
 */
type RouteGroup = {
	/** API version for the route group. If not specified, defaults to "default" */
	apiVersion?: string;
	/** Collection of routes within this group */
	routes: Route[];
};

/**
 * Represents a single API route configuration
 */
type Route = {
	/** HTTP methods supported by this route */
	methods: HttpMethod[];
	/** URL path for the route */
	path: string;
	/** If true, route will not be added to the API. Useful for development/testing */
	draft?: boolean;
	/** Integration that handles the route's requests */
	integration: HttpRouteIntegration;
};

/**
 * Constructs an HTTP API Gateway with configured routes
 * @extends Construct from CDK constructs
 */
export class Gateway extends Construct {
	/** The underlying HTTP API instance */
	public api: HttpApi;

	/**
	 * Creates a new Gateway instance
	 * @param scope - The scope in which to define this construct
	 * @param id - The scoped construct ID
	 * @param props - Configuration properties for the gateway
	 */
	constructor(scope: Construct, id: string, props: GatewayProps) {
		super(scope, id);
		this.api = new HttpApi(this, `${id}`, { ...props });

		if (props.routeGroups.length > 0) {
			for (let routeGroup of props.routeGroups) {
				for (let route of routeGroup.routes) {
					if (!route.draft)
						this.api.addRoutes({
							path: `/${
								routeGroup.apiVersion ? routeGroup.apiVersion : "/default"
							}${route.path}`,
							methods: route.methods,
							integration: route.integration,
						});
				}
			}
		}

		new CfnOutput(this, "HttpApiGateway", { value: this.api.apiEndpoint });
	}
}
