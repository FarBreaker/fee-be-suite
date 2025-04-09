/** @format */

export interface TagsConfig {
	[key: string]: string;
}

export const getTags = (environment: string): TagsConfig => {
	const commonTags: TagsConfig = {
		ManagedBy: "CDK",
		Project: "Symphony",
		LastUpdated: new Date().toISOString(),
		awsApplication:
			"arn:aws:resource-groups:eu-central-1:000468819253:group/symphony/091vqyc8ad0r5w366wwox66ahx",
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
		...(environmentTags[environment] || environmentTags["dev"]),
	};
};
