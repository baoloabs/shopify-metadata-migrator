import invariant from "tiny-invariant"
import {
	MetaobjectDefinitionByIdDocument,
	MetaobjectDefinitionByIdentifierDocument,
	MetaobjectDefinitionCreateDocument,
	MetaobjectDefinitionCreateInput,
	MetaobjectDefinitionFragmentFragment,
	MetaobjectDefinitionUpdateDocument,
	MetaobjectDefinitionUpdateMutationVariables,
} from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { notEmpty } from "../../utils"
import { logger } from "../../utils/logger"
/*
  - Metaobject definitions are defined by type
  - We want to hold a reference to the source metaobject definition
  - We want to hold a reference to the target metaobject definition
  - When we want a metaobject definition we want to be able to get it via these fallthrough steps:
    - Get it from the cache
    - If it doesn't exist in the cache, find it in the target metaobject definitions and put it in the cache
    - If it doesn't exist there then create it and put it in the cache
*/
import { getReferenceValue } from "../factory"
import { AbstractBuilder, AbstractResource } from "../resource"
import { metaobjectDefinitionsCache } from "./cache"

export class MetaobjectDefinition extends AbstractResource<MetaobjectDefinitionFragmentFragment> {
	get sourceId() {
		return this.source.id
	}

	get targetId() {
		return this.target.id
	}
}

export class MetaobjectDefinitionBuilder extends AbstractBuilder<
	MetaobjectDefinitionFragmentFragment,
	MetaobjectDefinition
> {
	async _createOnTargetStore(source: MetaobjectDefinitionFragmentFragment) {
		if (notEmpty(this.target)) return this.target

		const allFieldDefinitions = await Promise.all(
			source.fieldDefinitions.map(async fieldDefinition => ({
				description: fieldDefinition.description,
				key: fieldDefinition.key,
				name: fieldDefinition.name,
				required: false,
				type: fieldDefinition.type.name,
				validations: fieldDefinition.validations
					.filter(validation => notEmpty(validation.value))
					.map(validation => {
						return {
							name: validation.name,
							value: validation?.value as string,
						}
					}),
			})),
		)
		const selfReferencingFieldDefinitions = allFieldDefinitions.filter(fieldDefinition => {
			return fieldDefinition.validations.some(validation => validation.value === source.id)
		})
		const metaobjectDefinitionDefinitions = allFieldDefinitions.filter(fieldDefinition =>
			fieldDefinition.validations.some(validation => {
				const isADefinitionReference = validation?.value?.startsWith("gid://shopify/MetaobjectDefinition")

				if (selfReferencingFieldDefinitions.length === 0) {
					return isADefinitionReference
				}

				return isADefinitionReference && !selfReferencingFieldDefinitions.some(fD => fD.key === fieldDefinition.key)
			}),
		)
		const normalFieldDefinitions = allFieldDefinitions.filter(fieldDefinition => {
			return (
				!selfReferencingFieldDefinitions.some(fD => fD.key === fieldDefinition.key) &&
				!metaobjectDefinitionDefinitions.some(fD => fD.key === fieldDefinition.key)
			)
		})

		const target = await this.createDefinition({
			access: source.access,
			capabilities: source.capabilities,
			displayNameKey: source.displayNameKey,
			description: source.description,
			fieldDefinitions: normalFieldDefinitions,
			name: source.name,
			type: source.type,
		})

		logger.trace({
			selfReferencingFieldDefinitions,
			metaobjectDefinitionDefinitions,
			normalFieldDefinitions,
			allFieldDefinitions,
			target,
		})

		if ((target?.metaobjectDefinitionCreate?.userErrors?.length || 0) > 0) {
			logger.error(
				{
					errors: target?.metaobjectDefinitionCreate?.userErrors,
					target,
					source,
				},
				"MetaobjectDefinitionBuilder._createOnTargetStore",
			)
		}

		invariant(target?.metaobjectDefinitionCreate?.metaobjectDefinition)

		if (selfReferencingFieldDefinitions.length === 0 && metaobjectDefinitionDefinitions.length === 0) {
			this.target = target?.metaobjectDefinitionCreate?.metaobjectDefinition

			return this.target
		}

		const targetId = target.metaobjectDefinitionCreate.metaobjectDefinition.id

		const updatedTarget = await this.addAdditionalFields({
			id: targetId,
			definition: {
				fieldDefinitions: [
					...selfReferencingFieldDefinitions.map(fieldDefinition => {
						return {
							create: {
								...fieldDefinition,
								validations: fieldDefinition.validations.map(validation => {
									return {
										...validation,
										value: targetId,
									}
								}),
							},
						}
					}),
					...(await Promise.all(
						metaobjectDefinitionDefinitions.map(async fieldDefinition => {
							return {
								create: {
									...fieldDefinition,
									validations: await Promise.all(
										fieldDefinition.validations
											.filter(validation => notEmpty(validation.value))
											.map(async validation => {
												return {
													name: validation.name,
													value:
														validation?.value === source.id
															? validation.value
															: await getReferenceValue(validation?.value ?? ""),
												}
											}),
									),
								},
							}
						}),
					)),
				],
			},
		})

		if ((updatedTarget?.metaobjectDefinitionUpdate?.userErrors?.length || 0) > 0) {
			logger.error(
				{
					errors: updatedTarget?.metaobjectDefinitionUpdate?.userErrors,
					updatedTarget,
					target,
					source,
				},
				"MediaImageBuilder._createOnTargetStore 2",
			)
		}

		invariant(updatedTarget?.metaobjectDefinitionUpdate?.metaobjectDefinition)

		await this.reorderFields({
			id: targetId,
			definition: {
				resetFieldOrder: true,
				fieldDefinitions: allFieldDefinitions.map(fieldDefinition => ({
					update: {
						key: fieldDefinition.key,
					},
				})),
			},
		})

		if (notEmpty(updatedTarget?.metaobjectDefinitionUpdate?.metaobjectDefinition)) {
			this.target = updatedTarget?.metaobjectDefinitionUpdate?.metaobjectDefinition

			return this.target
		}

		throw new Error(`Cannot create ${this.resourceName} with identifier ${this.identifier} on target store`)
	}

	async _makeByIdentifierRequest(client: Client, identifier: string) {
		const request = await makeRequest(client, {
			document: this.documents.getByIdentifier,
			variables: {
				type: identifier,
			},
		})

		return request.record
	}

	getIdentifierFromSource(source: MetaobjectDefinitionFragmentFragment): string {
		return source.type
	}

	private async createDefinition(input: MetaobjectDefinitionCreateInput) {
		return makeRequest(global.targetClient, {
			document: this.documents.create,
			variables: {
				definition: input,
			},
		})
	}

	private async addAdditionalFields(variables: MetaobjectDefinitionUpdateMutationVariables) {
		return makeRequest(global.targetClient, {
			document: this.documents.update,
			variables,
		})
	}

	private async reorderFields(variables: MetaobjectDefinitionUpdateMutationVariables) {
		return makeRequest(global.targetClient, {
			document: this.documents.update,
			variables,
		})
	}

	get Resource() {
		return MetaobjectDefinition
	}

	get cache() {
		return metaobjectDefinitionsCache
	}

	get documents() {
		return {
			getByIdentifier: MetaobjectDefinitionByIdentifierDocument,
			getById: MetaobjectDefinitionByIdDocument,
			create: MetaobjectDefinitionCreateDocument,
			update: MetaobjectDefinitionUpdateDocument,
		}
	}
}
