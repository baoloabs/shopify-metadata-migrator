import { MetaobjectDefinitionFragmentFragment, MetaobjectDefinitionsDocument, Node } from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"

export async function getAllMetaobjectDefinitions(client: Client) {
	const getMetaobjectDefinitions = async (definitions: MetaobjectDefinitionFragmentFragment[] = [], after?: string) => {
		const { metaobjectDefinitions } = await makeRequest(client, {
			document: MetaobjectDefinitionsDocument,
			variables: { first: 25, after },
		})

		definitions.push(...metaobjectDefinitions.edges.map(({ node }: any) => node))

		if (metaobjectDefinitions.pageInfo.hasNextPage && metaobjectDefinitions.pageInfo.endCursor != null) {
			await getMetaobjectDefinitions(definitions, metaobjectDefinitions.pageInfo.endCursor)
		}

		return definitions
	}

	return getMetaobjectDefinitions()
}

export function sortDefinitionsByDependencies(
	definitions: MetaobjectDefinitionFragmentFragment[],
): MetaobjectDefinitionFragmentFragment[] {
	const nonDependentDefinitions = definitions.filter(definition => {
		return definition.fieldDefinitions.every(fieldDefinition => {
			if (fieldDefinition.type.category !== "REFERENCE") return true
			if (fieldDefinition.validations.length === 0) return true

			return fieldDefinition.validations.every(validation => {
				if (typeof validation.value !== "string") return true

				return !validation.value.includes("gid://shopify/MetaobjectDefinition")
			})
		})
	})
	const dependentDefinitions = definitions.filter(
		definition => !nonDependentDefinitions.find(d => d.type === definition.type),
	)

	if (dependentDefinitions.length + nonDependentDefinitions.length !== definitions.length) {
		throw new Error("Some definitions are missing")
	}

	return [...nonDependentDefinitions, ...dependentDefinitions]
}

export function metaobjectDefinitionDiffer(
	definitionA: MetaobjectDefinitionFragmentFragment,
	definitionB: MetaobjectDefinitionFragmentFragment,
) {
	const differences = deepCompare(
		stripMetaobjectReferenceValidations(definitionA),
		stripMetaobjectReferenceValidations(definitionB),
	)
	const okayKeysToIgnore = ["id"] as const
	const differencesWithoutOkayKeys: Omit<
		Accumulator<MetaobjectDefinitionFragmentFragment>,
		(typeof okayKeysToIgnore)[number]
	> = Object.fromEntries(
		Object.entries(differences).filter(([key]) => {
			return !(okayKeysToIgnore as ReadonlyArray<string>).includes(key)
		}),
	)

	if (Object.keys(differencesWithoutOkayKeys).length === 0) {
		return {}
	}

	return differencesWithoutOkayKeys

	function stripMetaobjectReferenceValidations(fragment: MetaobjectDefinitionFragmentFragment) {
		return {
			...fragment,
			fieldDefinitions: fragment.fieldDefinitions.map(fieldDefinition => {
				return {
					...fieldDefinition,
					validations: fieldDefinition.validations.filter(
						validation => !validation?.value?.startsWith("gid://shopify/MetaobjectDefinition"),
					),
				}
			}),
		}
	}
}

// pretty simple complicated as we're dealing with the same object type
type Accumulator<T> = { [k in keyof T]?: T[k] }

function deepCompare<T extends Node>(oldFilter: T, newFilter: T): Accumulator<T> {
	const traverse = <O>(obj: O, filter: O, target: Accumulator<O> = {}): Accumulator<O> => {
		for (const k in obj)
			if (obj[k] instanceof Object && filter[k]) {
				target[k] = {} as O[typeof k]

				const targetResult = traverse<O[typeof k]>(obj[k], filter[k], target[k])

				if (!Object.keys(targetResult).length) {
					delete target[k]
				}
			} else if (obj[k] !== filter[k]) {
				target[k] = obj[k]
			}

		return target
	}

	return traverse<T>(oldFilter, newFilter)
}
