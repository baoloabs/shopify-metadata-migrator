import { MetaobjectDefinitionDeleteDocument } from "../../generated/graphql"
import { makeRequest } from "../graphql"
import { getAllMetaobjectDefinitions } from "../resources/metaobjects/utils"

export async function deleteAllMetaobjectDefinitions() {
	const definitions = await getAllMetaobjectDefinitions(global.targetClient)

	for (const definition of definitions) {
		await makeRequest(global.targetClient, {
			document: MetaobjectDefinitionDeleteDocument,
			variables: {
				id: definition.id,
			},
		})
	}
}
