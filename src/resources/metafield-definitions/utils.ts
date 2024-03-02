import {
	MetafieldDefinitionSortKeys,
	MetafieldDefinitionsDocument,
	MetafieldOwnerType,
} from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { MetafieldDefinitions } from "../../types"

export async function getAllMetafieldDefinitions(client: Client) {
	const types = Object.values(MetafieldOwnerType)

	return types.reduce(
		async (definitions, type) => {
			const metafieldsByType = await getAllSourceMetafieldDefinitionsByType(type, client)

			return [...(await definitions), ...metafieldsByType]
		},
		Promise.resolve([] as MetafieldDefinitions),
	)
}

async function getAllSourceMetafieldDefinitionsByType(type: MetafieldOwnerType, client: Client) {
	const getMetafieldDefinitions = async (definitions: MetafieldDefinitions = [], after?: string) => {
		const { metafieldDefinitions } = await makeRequest(client, {
			document: MetafieldDefinitionsDocument,
			variables: {
				first: 10,
				after,
				ownerType: type,
				sortKey: MetafieldDefinitionSortKeys.PinnedPosition,
				reverse: true,
			},
		})

		definitions.push(...metafieldDefinitions.edges.map(({ node }) => node))

		if (metafieldDefinitions.pageInfo.hasNextPage && metafieldDefinitions.pageInfo.endCursor != null) {
			await getMetafieldDefinitions(definitions, metafieldDefinitions.pageInfo.endCursor)
		}

		return filterOutStandardDefinitions(definitions)
	}

	return getMetafieldDefinitions()
}

function filterOutStandardDefinitions(definitions: MetafieldDefinitions) {
	return definitions.filter(({ standardTemplate }) => standardTemplate == null)
}
