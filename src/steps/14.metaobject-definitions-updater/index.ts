import { MetaobjectDefinitionUpdateDocument } from "../../../generated/graphql"
import { makeRequest } from "../../graphql"
import { getReferenceValue } from "../../resources/factory"
import { getAllMetaobjectDefinitions, metaobjectDefinitionDiffer } from "../../resources/metaobjects/utils"
import { notEmpty } from "../../utils"
import { logger } from "../../utils/logger"

export async function updateMetaobjectDefinitions() {
	const [sourceDefinitions, targetDefinitions] = await Promise.all([
		getAllMetaobjectDefinitions(global.sourceClient),
		getAllMetaobjectDefinitions(global.targetClient),
	])

	for (const sourceDefinition of sourceDefinitions) {
		const targetDefinition = targetDefinitions.find(definition => definition.type === sourceDefinition.type)
		if (typeof targetDefinition === "undefined") {
			logger.warn(`Definition not found in target: ${sourceDefinition.type}`)

			continue
		}

		const differences = metaobjectDefinitionDiffer(sourceDefinition, targetDefinition)

		if (Object.keys(differences).length === 0) {
			logger.info(`No differences found for ${sourceDefinition.type}`)

			continue
		}

		logger.trace({ differences }, `Differences found for ${sourceDefinition.type}`)

		const updatedDefinition = await makeRequest(global.targetClient, {
			document: MetaobjectDefinitionUpdateDocument,
			variables: {
				id: targetDefinition.id,
				definition: {
					access: sourceDefinition.access,
					capabilities: sourceDefinition.capabilities,
					displayNameKey: sourceDefinition.displayNameKey,
					description: sourceDefinition.description,
					fieldDefinitions: await Promise.all(
						sourceDefinition.fieldDefinitions.map(async definition => {
							return {
								update: {
									key: definition.key,
									name: definition.name,
									description: definition.description,
									required: definition.required,
									validations: await Promise.all(
										definition.validations
											.filter(validation => notEmpty(validation.value))
											.map(async validation => {
												return {
													name: validation.name,
													value: await getReferenceValue(validation?.value ?? ""),
												}
											}),
									),
								},
							}
						}),
					),
					name: sourceDefinition.name,
				},
			},
		})

		if ((updatedDefinition?.metaobjectDefinitionUpdate?.userErrors?.length || 0) > 0) {
			logger.error(
				{
					errors: updatedDefinition?.metaobjectDefinitionUpdate?.userErrors,
					updatedDefinition,
				},
				"updateMetaobjectDefinitions",
			)
		}
	}
}
