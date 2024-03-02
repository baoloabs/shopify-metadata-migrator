import invariant from "tiny-invariant"
import {
	ProductBulkFragmentFragment,
	ProductVariantAppendMediaDocument,
	ProductVariantAppendMediaInput,
	ProductVariantAppendMediaMutationVariables,
} from "../../../generated/graphql"
import { makeRequest } from "../../graphql"
import { bulkProductCreateMutation } from "../../graphql/mutations/bulk-product-create-mutation"
import { bulkProductUpdateMutation } from "../../graphql/mutations/bulk-product-update-mutation"
import { productResource } from "../../resources/product"
import { BaseBulkMigratorOptions, baseBulkMigratorOptions } from "../../types"
import { logger } from "../../utils/logger"
import { BulkProductMigrator, bulkQueryProduct } from "./bulk-product-migrator"

export async function migrateProducts() {
	await transferProducts()
	await updateVariantImages()
}

async function transferProducts() {
	await new BulkProductMigrator(productResource, bulkProductCreateMutation, bulkProductUpdateMutation).migrate()
}

async function updateVariantImages() {
	const bulkProductVariantImageUpdater = new BulkProductVariantImageUpdater()

	return bulkProductVariantImageUpdater.run()
}

type QueryValue = {
	source: ProductBulkFragmentFragment
	target: ProductBulkFragmentFragment
}
type QueryData = Map<ProductBulkFragmentFragment["handle"], QueryValue>

class BulkProductVariantImageUpdater {
	constructor(private readonly options: BaseBulkMigratorOptions = baseBulkMigratorOptions) {}

	async run() {
		const sourceData = await this.getSourceStoreData()
		const targetData = await this.getTargetStoreData(sourceData)

		for (const targetDatum of targetData) {
			const productVariant = await makeRequest(global.targetClient, {
				document: ProductVariantAppendMediaDocument,
				variables: targetDatum,
			})

			if ((productVariant?.productVariantAppendMedia?.userErrors?.length || 0) > 0) {
				logger.error(
					{
						errors: productVariant?.productVariantAppendMedia?.userErrors,
						productVariant,
					},
					"BulkProductVariantImageUpdater",
				)
			}
		}
	}

	async getSourceStoreData(): Promise<QueryData> {
		const [sourceData, targetData] = await Promise.all([
			bulkQueryProduct(global.sourceClient, this.options.forceFresh),
			bulkQueryProduct(global.targetClient, this.options.forceFresh),
		])

		const sourceValues = Array.from(sourceData.values())
		const targetValues = Array.from(targetData.values())

		return sourceValues.reduce<
			Map<string, { source: ProductBulkFragmentFragment; target: ProductBulkFragmentFragment }>
		>((acc, source) => {
			const target = targetValues.find(({ handle }) => handle === source.handle)
			invariant(target, `Target product with id ${source.handle} not found`)

			acc.set(source.handle, { source, target })

			return acc
		}, new Map([]))
	}

	async getTargetStoreData(sourceData: QueryData): Promise<ProductVariantAppendMediaMutationVariables[]> {
		return Array.from(sourceData.values()).reduce<ProductVariantAppendMediaMutationVariables[]>(
			(acc, { source: sourceProduct, target: targetProduct }) => {
				const hasVariantMedia = sourceProduct.variants.edges.some(({ node }) => (node.media?.edges.length ?? 0) > 0)
				if (!hasVariantMedia) return acc

				const input: ProductVariantAppendMediaMutationVariables = {
					productId: targetProduct.id,
					variantMedia: sourceProduct.variants.edges
						.map(({ node: variant }, index) => {
							if (!variant.media?.edges.length) return null

							const targetVariant = targetProduct.variants.edges[index]
							invariant(targetVariant, `Target variant with index ${index} not found`)

							const sourceMediaIndex = sourceProduct.media.edges.findIndex(
								({ node: media }) => media.id === variant.media?.edges[0].node.id,
							)
							if (sourceMediaIndex <= 0) return null

							const targetMedia = targetProduct.media.edges[sourceMediaIndex]
							invariant(targetMedia, `Target media with index ${sourceMediaIndex} not found`)

							return {
								variantId: targetVariant.node.id,
								mediaIds: [targetMedia.node.id],
							}
						})
						.filter(Boolean) as ProductVariantAppendMediaInput[],
				}

				acc.push(input)

				return acc
			},
			[],
		)
	}
}
