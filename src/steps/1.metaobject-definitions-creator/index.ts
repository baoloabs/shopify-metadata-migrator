import { MetaobjectDefinitionBuilder } from "../../resources/metaobject-definitions"
import { getAllMetaobjectDefinitions, sortDefinitionsByDependencies } from "../../resources/metaobjects/utils"

export async function createMetaobjectDefinitions() {
	const [sortedDefinitions, targetDefinitions] = await Promise.all([
		sortDefinitionsByDependencies(await getAllMetaobjectDefinitions(global.sourceClient)),
		getAllMetaobjectDefinitions(global.targetClient),
	])

	for (const rawDefinition of sortedDefinitions) {
		const targetDefinition = targetDefinitions.find(definition => definition.type === rawDefinition.type)
		const builder = new MetaobjectDefinitionBuilder({
			source: rawDefinition,
			target: targetDefinition,
			identifier: rawDefinition.type,
			sourceId: rawDefinition.id,
		})

		await builder.build()
	}
}
