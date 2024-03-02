import invariant from "tiny-invariant"
import {
	CollectionAddProductsDocument,
	CollectionBulkSimpleFragmentFragment,
	CollectionFragmentFragment,
	CollectionInput,
	CollectionProductsDocument,
	CollectionProductsQuery,
	CollectionRuleColumn,
	CollectionRuleInput,
	MetafieldOwnerType,
} from "../../../generated/graphql"
import { makeRequest } from "../../graphql"
import { ResourceName } from "../../utils/bulk-migrator"
import { logger } from "../../utils/logger"
import { MetafieldDefinitionBuilder } from "../metafield-definitions"

function getBaseCollectionInput(source: CollectionFragmentFragment): CollectionInput {
	const collectionInput: CollectionInput = {
		descriptionHtml: source.descriptionHtml,
		handle: source.handle,
		sortOrder: source.sortOrder,
		templateSuffix: source.templateSuffix,
		title: source.title,
	}

	if (source.image != null) {
		collectionInput.image = {
			altText: source.image.altText,
			src: source.image.url,
		}
	}

	if (source.seo != null) {
		collectionInput.seo = {
			description: source.seo.description,
			title: source.seo.title,
		}
	}

	return collectionInput
}

export async function getSmartCollectionInput(source: CollectionFragmentFragment): Promise<CollectionInput> {
	return {
		...getBaseCollectionInput(source),
		ruleSet: {
			appliedDisjunctively: source.ruleSet?.appliedDisjunctively ?? false,
			rules: await Promise.all(
				(source.ruleSet?.rules ?? []).map(async rule => {
					const ruleData: CollectionRuleInput = {
						column: rule.column,
						condition: rule.condition,
						relation: rule.relation,
					}

					if (rule.column === CollectionRuleColumn.ProductTaxonomyNodeId) {
						invariant(rule.conditionObject)
						invariant(rule.conditionObject.__typename === "CollectionRuleProductCategoryCondition")

						ruleData.condition = rule.conditionObject.value.id
					}

					if (rule.column === CollectionRuleColumn.ProductMetafieldDefinition) {
						invariant(rule.conditionObject)
						invariant(rule.conditionObject.__typename === "CollectionRuleMetafieldCondition")

						const metafield = await new MetafieldDefinitionBuilder({
							sourceId: rule.conditionObject.metafieldDefinition.id,
							ownerType: MetafieldOwnerType.Product,
						}).build()

						ruleData.conditionObjectId = metafield.target.id
					}

					return ruleData
				}),
			),
		},
	}
}

export function getCustomCollectionInput(
	source: CollectionBulkSimpleFragmentFragment | CollectionFragmentFragment,
): CollectionInput {
	const baseInput = getBaseCollectionInput(source)

	if ("products" in source) {
		return {
			...baseInput,
			products: source.products.edges.map(({ node }) => node.id),
		}
	}

	return baseInput
}

export async function addProductsToCollection(targetId: string, sourceId: string) {
	const target = await makeRequest(global.targetClient, {
		document: CollectionAddProductsDocument,
		variables: {
			id: targetId,
			productIds: await getCollectionProductIds(sourceId),
		},
	})

	invariant(target.collectionAddProductsV2)

	if ((target?.collectionAddProductsV2?.userErrors?.length || 0) > 0) {
		logger.error(
			{
				errors: target?.collectionAddProductsV2?.userErrors,
				target,
				targetId,
				sourceId,
			},
			"addProductsToCollection",
		)
	}

	return target.collectionAddProductsV2.job
}

async function getCollectionProductIds(sourceId: string): Promise<string[]> {
	const getProducts = async (
		products: NonNullable<CollectionProductsQuery["collection"]>["products"]["nodes"] = [],
		after?: string,
	) => {
		const { collection } = await makeRequest(global.sourceClient, {
			document: CollectionProductsDocument,
			variables: { id: sourceId, after },
		})

		invariant(collection)

		products.push(...collection.products.nodes)

		if (collection.products.pageInfo.hasNextPage && collection.products.pageInfo.endCursor != null) {
			await getProducts(products, collection.products.pageInfo.endCursor)
		}

		return products
	}

	return (await getProducts()).map(product => product.id)
}

export const collectionResource: ResourceName = { single: "collection", plural: "collections" }
