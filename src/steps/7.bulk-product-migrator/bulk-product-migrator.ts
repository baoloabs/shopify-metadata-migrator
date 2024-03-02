import invariant from "tiny-invariant"
import {
	MediaFragmentFragment,
	ProductBulkFragmentFragment,
	ProductVariantBulkFragmentFragment,
} from "../../../generated/graphql"
import { Client } from "../../graphql"
import { bulkProductsQuery } from "../../graphql/queries/bulk-products-query"
import { productResource } from "../../resources/product"
import { ProductInputCreator } from "../../resources/product/utils"
import { WithParentId } from "../../types"
import { deeplyStripKeys } from "../../utils"
import { BulkMigrator, OperationValue } from "../../utils/bulk-migrator-2"
import { BulkQuery } from "../../utils/bulk-query"
import { logger } from "../../utils/logger"

type QueryData = Map<ProductBulkFragmentFragment["id"], ProductBulkFragmentFragment>

export class BulkProductMigrator extends BulkMigrator<ProductBulkFragmentFragment, QueryData> {
	getData(client: Client): Promise<QueryData> {
		return bulkQueryProduct(client, this.options.forceFresh)
	}

	findTargetData(
		sourceData: ProductBulkFragmentFragment,
		targetData: ProductBulkFragmentFragment[],
	): ProductBulkFragmentFragment | undefined {
		return targetData.find(({ handle }) => handle === sourceData.handle)
	}

	getDatumKey(datum: ProductBulkFragmentFragment): string {
		return datum.handle
	}

	deeplyCompareData(sourceData: ProductBulkFragmentFragment, targetData: ProductBulkFragmentFragment): boolean {
		const areTheSame = deeplyCompareBulkProducts(sourceData, targetData)

		if (!areTheSame) {
			logger.info({
				differences: findDifferencesBetweenBulkProducts(sourceData, targetData),
			})
		}

		return areTheSame
	}

	async transformCreateData(data: OperationValue<ProductBulkFragmentFragment>) {
		const baseInput = await ProductInputCreator.get(data.source)

		return {
			input: baseInput.product,
			mediaInput: baseInput.media,
		}
	}

	async transformUpdateData(data: OperationValue<ProductBulkFragmentFragment>) {
		if (data.target == null) return null

		const baseInput = await ProductInputCreator.get(data.source)

		return {
			input: {
				...baseInput.product,
				id: data.target.id,
			},
			mediaInput: baseInput.media,
		}
	}
}

export async function bulkQueryProduct(client: Client, forceFresh = false, filterOutProducts = true) {
	const bulkQuery = new BulkQuery<
		ProductBulkFragmentFragment,
		ProductBulkFragmentFragment,
		{
			key: string
			value: ProductBulkFragmentFragment
		}
	>(bulkProductsQuery, client, productResource, forceFresh)

	const products = await bulkQuery.run(transformProductBulkQueryResultLine)

	if (!filterOutProducts) {
		return products
	}

	return products
}

export type PossibleQueryLine =
	| ProductBulkFragmentFragment
	| WithParentId<MediaFragmentFragment>
	| WithParentId<ProductVariantBulkFragmentFragment>

export function transformProductBulkQueryResultLine(
	line: PossibleQueryLine,
	data: Map<ProductBulkFragmentFragment["id"], ProductBulkFragmentFragment>,
): { key: string; value: ProductBulkFragmentFragment } {
	switch (line.__typename) {
		case "Product":
			return {
				key: line.id,
				value: {
					...line,
					media: {
						edges: [],
					},
					variants: {
						edges: [],
					},
				},
			}
		case "ProductVariant": {
			const product = findParentProduct(data, line.__parentId)
			invariant(product, `Product with id ${line.__parentId} not found`)

			product.variants.edges.push({
				node: {
					...line,
					media: {
						edges: [],
					},
				},
			})

			return {
				key: product.id,
				value: product,
			}
		}
		case "ExternalVideo":
		case "MediaImage":
		case "Model3d":
		case "Video": {
			const product = findParentProduct(data, line.__parentId)
			invariant(product, `Product with id ${line.__parentId} not found`)

			if (line.__parentId.includes("/Product/")) {
				product.media.edges.push({ node: line })
			} else if (line.__parentId.includes("/ProductVariant")) {
				const variant = product.variants.edges.find(({ node }) => node.id === line.__parentId)
				invariant(variant, `Variant with id ${line.__parentId} not found`)

				if (!variant.node.media) {
					variant.node.media = {
						edges: [],
					}
				}

				variant.node.media.edges.push({ node: line })
			} else {
				throw new Error(`Unknown parent id ${line.__parentId}`)
			}

			return {
				key: product.id,
				value: product,
			}
		}
		default:
			logger.error({ line })
			throw new Error(`Unknown type ${line}`)
	}
}

function findParentProduct(
	data: Map<ProductBulkFragmentFragment["id"], ProductBulkFragmentFragment>,
	parentId: string,
): ProductBulkFragmentFragment {
	if (parentId.includes("/Product/")) {
		const parent = data.get(parentId)
		invariant(parent, `Parent with id ${parentId} not found`)

		return parent
	}

	if (parentId.includes("/ProductVariant/")) {
		for (const value of data.values()) {
			const variant = value.variants.edges.some(({ node }) => node.id === parentId)

			if (variant) {
				return value
			}
		}
	}

	throw new Error(`Unknown parent id ${parentId}`)
}

function deeplyCompareBulkProducts(
	productA: ProductBulkFragmentFragment,
	productB: ProductBulkFragmentFragment,
): boolean {
	// TODO: Currently ignores media
	// TODO: This can return true a lot. Variants can be wrong because of price differences. Do we need to supply a whitelist of fields to compare and then just diff on those?
	const keysToIgnore = ["id", "__parentId", "media", "giftCardTemplateSuffix"]
	const strippedProductA = deeplyStripKeys(productA, keysToIgnore)
	const strippedProductB = deeplyStripKeys(productB, keysToIgnore)

	return JSON.stringify(strippedProductA) === JSON.stringify(strippedProductB)
}

function findDifferencesBetweenBulkProducts(
	productA: Record<string, any>,
	productB: Record<string, any>,
	differences: Record<string, { source: any; target: any }> = {},
): Record<string, { source: any; target: any }> {
	const strippedProductA = deeplyStripKeys(productA, ["id", "__parentId"])
	const strippedProductB = deeplyStripKeys(productB, ["id", "__parentId"])

	for (const strippedProductAKey in strippedProductA) {
		if (typeof strippedProductA[strippedProductAKey] === "object") {
			findDifferencesBetweenBulkProducts(
				strippedProductA[strippedProductAKey],
				strippedProductB[strippedProductAKey],
				differences,
			)

			continue
		}

		if (strippedProductA[strippedProductAKey] !== strippedProductB[strippedProductAKey]) {
			differences[strippedProductAKey] = {
				source: strippedProductA[strippedProductAKey],
				target: strippedProductB[strippedProductAKey],
			}
		}
	}

	return differences
}
