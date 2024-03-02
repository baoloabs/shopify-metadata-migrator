import { createGraphQLClient } from "./src/graphql"
import { createRestClient } from "./src/rest"

type ApiLimits = {
	maximumAvailable: number
	currentlyAvailable: number
	restoreRate: number
}

declare global {
	var tmpDirectory: string

	var sourceClient: ReturnType<typeof createGraphQLClient>
	var targetClient: ReturnType<typeof createGraphQLClient>

	var sourceStorefrontClient: ReturnType<typeof createGraphQLClient>
	var targetStorefrontClient: ReturnType<typeof createGraphQLClient>

	var sourceRestClient: ReturnType<typeof createRestClient>
	var targetRestClient: ReturnType<typeof createRestClient>

	var apiLimits: Record<
		string,
		{
			maximumAvailable: number
			currentlyAvailable: number
			restoreRate: number
		}
	>
}
