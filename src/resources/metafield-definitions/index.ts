import invariant from "tiny-invariant"
import {
	MetafieldDefinitionByIdDocument,
	MetafieldDefinitionByIdentifierDocument,
	MetafieldDefinitionCreateDocument,
	MetafieldDefinitionCreateMutationVariables,
	MetafieldDefinitionFragmentFragment,
	MetafieldOwnerType,
	MetaobjectDefinitionCreateDocument,
} from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { notEmpty } from "../../utils"
import { logger } from "../../utils/logger"
import { getReferenceValue } from "../factory"
import { AbstractBuilder, AbstractIdentifierBuilder, AbstractResource } from "../resource"
import { metafieldDefinitionsCache } from "./cache"

export class MetafieldDefinition extends AbstractResource<MetafieldDefinitionFragmentFragment> {
	get sourceId() {
		return this.source.id
	}

	get targetId() {
		return this.target.id
	}
}

export class MetafieldDefinitionBuilder extends AbstractBuilder<
	MetafieldDefinitionFragmentFragment,
	MetafieldDefinition
> {
	dontPinOnCreate?: boolean = false
	ownerType: MetafieldOwnerType

	constructor({
		source,
		target,
		identifier,
		sourceId,
		ownerType,
		dontPinOnCreate,
	}: {
		source?: MetafieldDefinitionFragmentFragment | undefined
		target?: MetafieldDefinitionFragmentFragment | undefined
		ownerType: MetafieldOwnerType
		identifier?: string
		sourceId?: string
		dontPinOnCreate?: boolean
	}) {
		super({ source, target, identifier, sourceId, ownerType })

		this.dontPinOnCreate = dontPinOnCreate

		if (typeof identifier === "undefined" && typeof sourceId === "undefined") {
			throw new Error("Cannot build metafield definition without either an identifier or sourceId")
		}

		this.ownerType = ownerType
	}

	async _createOnTargetStore(source: MetafieldDefinitionFragmentFragment) {
		if (notEmpty(this.target)) return this.target

		const definition: MetafieldDefinitionCreateMutationVariables["definition"] = {
			description: source.description,
			key: source.key,
			name: source.name,
			namespace: source.namespace,
			ownerType: this.ownerType,
			pin: this.dontPinOnCreate ? false : source.pinnedPosition != null,
			type: source.type.name,
			useAsCollectionCondition: source.useAsCollectionCondition,
			validations: await Promise.all(
				source.validations
					.filter(validation => notEmpty(validation.value))
					.map(async validation => {
						return {
							name: validation.name,
							value: await getReferenceValue(validation?.value ?? ""),
						}
					}),
			),
		}

		// TODO: There is currently any issue where I can't set the storefront access for these on 2024-01?

		const target = await makeRequest(global.targetClient, {
			document: MetafieldDefinitionCreateDocument,
			variables: {
				definition,
			},
		})

		logger.trace({ source, definition, target })

		if ((target?.metafieldDefinitionCreate?.userErrors?.length || 0) > 0) {
			logger.error(
				{
					errors: target?.metafieldDefinitionCreate?.userErrors,
					target,
					source,
				},
				"MetafieldDefinitionBuilder._createOnTargetStore",
			)
		}

		if (notEmpty(target?.metafieldDefinitionCreate) && notEmpty(target?.metafieldDefinitionCreate?.createdDefinition)) {
			this.target = target.metafieldDefinitionCreate.createdDefinition as MetafieldDefinitionFragmentFragment

			return this.target
		}

		throw new Error(`Cannot create ${this.resourceName} with type ${source.type} on target store`)
	}

	async _makeByIdentifierRequest(client: Client, identifier: string) {
		const identifierBuilder = new MetafieldDefinitionIdentifierBuilder()
		const { namespace, key } = identifierBuilder.extractPartsFromIdentifier(identifier)

		const source = await makeRequest(client, {
			document: MetafieldDefinitionByIdentifierDocument,
			variables: {
				query: `namespace:"${namespace}" AND key:"${key}"`,
				ownerType: this.ownerType,
			},
		})

		return source?.record?.edges?.[0]?.node
	}

	getIdentifierFromSource(source: MetafieldDefinitionFragmentFragment): string {
		const builder = new MetafieldDefinitionIdentifierBuilder()

		return builder.buildIdentifierFromParts(source)
	}

	get Resource() {
		return MetafieldDefinition
	}

	get cache() {
		return metafieldDefinitionsCache
	}

	get documents() {
		return {
			getByIdentifier: MetafieldDefinitionByIdentifierDocument,
			getById: MetafieldDefinitionByIdDocument,
			create: MetaobjectDefinitionCreateDocument,
		}
	}
}

export class MetafieldDefinitionIdentifierBuilder extends AbstractIdentifierBuilder<MetafieldDefinitionFragmentFragment> {
	extractPartsFromIdentifier(
		identifier: string,
	): ReturnType<MetafieldDefinitionIdentifierBuilder["extractIdentifierFromSource"]> {
		const searchParams = new URLSearchParams(identifier)
		const [namespace, key, ownerType] = [
			searchParams.get("namespace"),
			searchParams.get("key"),
			searchParams.get("ownerType"),
		]

		invariant(namespace != null, `Unable to extract namespace from identifier ${identifier}`)
		invariant(key != null, `Unable to extract key from identifier ${identifier}`)
		invariant(ownerType != null, `Unable to extract ownerType from identifier ${identifier}`)

		return { namespace, key, ownerType: ownerType as MetafieldOwnerType }
	}

	extractIdentifierFromSource(source: MetafieldDefinitionFragmentFragment) {
		return {
			namespace: source.namespace,
			key: source.key,
			ownerType: source.ownerType,
		}
	}
}
