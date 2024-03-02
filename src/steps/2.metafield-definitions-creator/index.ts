import { MetafieldDefinitionPinDocument, MetafieldDefinitionUnpinDocument } from "../../../generated/graphql"
import { makeRequest } from "../../graphql"
import {
	MetafieldDefinition,
	MetafieldDefinitionBuilder,
	MetafieldDefinitionIdentifierBuilder,
} from "../../resources/metafield-definitions"
import { getAllMetafieldDefinitions } from "../../resources/metafield-definitions/utils"

export async function createMetafieldDefinitions() {
	return await MetafieldDefinitionsMigrator.run()
}

class MetafieldDefinitionsMigrator {
	static async run() {
		const creator = new MetafieldDefinitionsMigrator()

		return creator.run()
	}

	async run() {
		const [sourceDefinitions, targetDefinitions] = await Promise.all([
			getAllMetafieldDefinitions(global.sourceClient),
			getAllMetafieldDefinitions(global.targetClient),
		])

		const builtDefinitions: MetafieldDefinition[] = []

		for (const rawDefinition of sourceDefinitions) {
			const targetDefinition = targetDefinitions.find(
				definition => definition.type === rawDefinition.type && definition.key === rawDefinition.key,
			)
			const identifierBuilder = new MetafieldDefinitionIdentifierBuilder()

			const builder = new MetafieldDefinitionBuilder({
				source: rawDefinition,
				target: targetDefinition,
				identifier: identifierBuilder.buildIdentifierFromParts(rawDefinition),
				sourceId: rawDefinition.id,
				ownerType: rawDefinition.ownerType,
				dontPinOnCreate: true,
			})

			builtDefinitions.push(await builder.build())
		}

		await this.updatePinnedPositions(builtDefinitions)
	}

	private async updatePinnedPositions(definitions: MetafieldDefinition[]) {
		await this.unpinAllDefinitions(definitions)

		const pinnedDefinitions = definitions.filter(definition => definition.source.pinnedPosition != null)

		for (const reversePinnedDefinition of pinnedDefinitions) {
			await makeRequest(global.targetClient, {
				document: MetafieldDefinitionPinDocument,
				variables: {
					definitionId: reversePinnedDefinition.target.id,
				},
			})
		}
	}

	private async unpinAllDefinitions(definitions: MetafieldDefinition[]) {
		for (const definition of definitions) {
			await makeRequest(global.targetClient, {
				document: MetafieldDefinitionUnpinDocument,
				variables: {
					definitionId: definition.target.id,
				},
			})
		}
	}
}
