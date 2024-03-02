import invariant from "tiny-invariant"
import {
	BulkMetafieldsSetMutationVariables,
	MetafieldsSetInput,
	ProductMetafieldFragmentFragment,
} from "../../../generated/graphql"
import { bulkMetafieldsSetMutation } from "../../graphql/mutations/bulk-metafields-set-mutation"
import { bulkProductMetafieldsQuery } from "../../graphql/queries/bulk-product-metafields-query"
import { getReferenceValue } from "../../resources/factory"
import { ProductBuilder, productResource } from "../../resources/product"
import { BaseBulkMigratorOptions, WithParentId, baseBulkMigratorOptions } from "../../types"
import { FileDownloader } from "../../utils"
import { createBulkMutationResourceFromData } from "../../utils/bulk-migrator"
import { BulkOperationMutationRunner } from "../../utils/bulk-operation-runner"
import { BulkQuery } from "../../utils/bulk-query"
import { logger } from "../../utils/logger"

export async function migrateProductMetafields() {
	return new BulkProductMetafieldMigrator().run()
}

type PossibleQueryLine =
	| ProductMetafieldFragmentFragment
	| WithParentId<ProductMetafieldFragmentFragment["metafields"]["edges"][number]["node"]>

const MAXIMUM_NUMBER_OF_METAFIELDS_THAN_CAN_BE_SET = 25

class BulkProductMetafieldMigrator {
	constructor(private readonly options: BaseBulkMigratorOptions = baseBulkMigratorOptions) {}

	async run() {
		const sourceData = await this.getSourceStoreData()

		const mutationResource = await createBulkMutationResourceFromData(
			sourceData,
			`${productResource.single}-metafields-set.jsonl`,
			async (data: ProductMetafieldFragmentFragment) => await this.getInputData(data),
		)
		const bulkMutationRunner = new BulkOperationMutationRunner(
			productResource,
			bulkMetafieldsSetMutation,
			global.targetClient,
		)
		const finishedBulkMutation = await bulkMutationRunner.execute(mutationResource)

		const resource = await FileDownloader.download(
			finishedBulkMutation.url,
			`bulk-${productResource.single}-metafield-migrator-metafields-set.jsonl`,
		)

		logger.info({ finishedBulkMutation }, `Finished bulk import. You can find it at ${resource.location}`)
	}

	private async getSourceStoreData() {
		const bulkQuery = new BulkQuery<
			PossibleQueryLine,
			ProductMetafieldFragmentFragment,
			{
				key: string
				value: ProductMetafieldFragmentFragment
			}
		>(bulkProductMetafieldsQuery, global.sourceClient, productResource, this.options.forceFresh)

		return bulkQuery.run((line, data) => {
			switch (line.__typename) {
				case "Product":
					return {
						key: line.id,
						value: {
							...line,
							metafields: {
								...line.metafields,
								edges: [],
							},
						},
					}
				case "Metafield": {
					const product = data.get(line.__parentId)
					invariant(product != null, "Product not found")

					product.metafields.edges.push({ node: line })

					return {
						key: product.id,
						value: product,
					}
				}
			}
		})
	}

	private async getInputData(
		sourceData: ProductMetafieldFragmentFragment,
	): Promise<BulkMetafieldsSetMutationVariables | Array<BulkMetafieldsSetMutationVariables> | null> {
		const metafields = sourceData.metafields.edges.map(edge => edge.node)

		if (metafields.length === 0) {
			return null
		}

		const metafieldsSetInput: MetafieldsSetInput[] = []

		for (const metafield of metafields) {
			if (metafield.namespace.includes("shopify--discovery")) continue

			const [owner, value] = await Promise.all([
				new ProductBuilder({ identifier: sourceData.handle }).build(),
				getReferenceValue(metafield.value),
			])

			metafieldsSetInput.push({
				namespace: metafield.namespace,
				key: metafield.key,
				ownerId: owner.targetId,
				type: metafield.type,
				value,
			})
		}

		if (metafieldsSetInput.length > MAXIMUM_NUMBER_OF_METAFIELDS_THAN_CAN_BE_SET) {
			return chunkArray(metafieldsSetInput, MAXIMUM_NUMBER_OF_METAFIELDS_THAN_CAN_BE_SET).map(chunk => ({
				metafields: chunk,
			}))
		}

		return { metafields: metafieldsSetInput }
	}
}

function chunkArray<T>(array: T[], size: number) {
	const result = []

	for (let i = 0; i < array.length; i += size) {
		result.push(array.slice(i, i + size))
	}

	return result
}
