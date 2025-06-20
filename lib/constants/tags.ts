/** @format */

export interface TagsConfig {
	[key: string]: string;
}

export const getTags = (environment: string): TagsConfig => {
	const commonTags: TagsConfig = {
		ManagedBy: "CDK",
		Project: "FEE_SUITE",
		// LastUpdated: new Date().toISOString(),
		awsApplication:
			"arn:aws:resource-groups:eu-central-1:000468819253:group/fee-suite/01o2gty3uabg42ao3jsnhrcu5m",
	};

	const environmentTags: Record<string, TagsConfig> = {
		dev: {
			Environment: "Development",
			CostCenter: "DevTeam",
			Owner: "DevOps",
		},
		staging: {
			Environment: "Staging",
			CostCenter: "QATeam",
			Owner: "QA",
		},
		prod: {
			Environment: "Production",
			CostCenter: "ProdTeam",
			Owner: "Operations",
		},
	};

	return {
		...commonTags,
		...(environmentTags[environment] || environmentTags.dev),
	};
};
