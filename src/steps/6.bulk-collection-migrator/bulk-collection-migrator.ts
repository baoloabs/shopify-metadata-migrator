import invariant from "tiny-invariant"
import {
	CollectionBulkSimpleFragmentFragment,
	CollectionFragmentFragment,
	CollectionInput,
	SimpleProductIdFragmentFragment,
} from "../../../generated/graphql"
import { Client } from "../../graphql"
import { bulkCustomCollectionsQuery } from "../../graphql/queries/bulk-custom-collections-query"
import { bulkSimpleProductsQuery } from "../../graphql/queries/bulk-simple-products-query"
import { bulkSmartCollectionsQuery } from "../../graphql/queries/bulk-smart-collections-query"
import { collectionResource, getCustomCollectionInput, getSmartCollectionInput } from "../../resources/collection/utils"
import { WithParentId } from "../../types"
import { FileDownloader, deeplyStripKeys } from "../../utils"
import { createBulkMutationResourceFromData } from "../../utils/bulk-migrator"
import { BulkMigrator, OperationValue } from "../../utils/bulk-migrator-2"
import { BulkOperationMutationRunner } from "../../utils/bulk-operation-runner"
import { BulkQuery } from "../../utils/bulk-query"
import { log } from "../../utils/log"
import { logger } from "../../utils/logger"

type Input = { input: CollectionInput }
type QueryData = Map<CollectionFragmentFragment["id"], CollectionFragmentFragment>

export class BulkSmartCollectionMigrator extends BulkMigrator<CollectionFragmentFragment, QueryData> {
	getData(client: Client): Promise<QueryData> {
		return bulkQuerySmartCollection(client, this.options.forceFresh)
	}

	findTargetData(
		sourceData: CollectionFragmentFragment,
		targetData: CollectionFragmentFragment[],
	): CollectionFragmentFragment | undefined {
		return targetData.find(({ handle }) => handle === sourceData.handle)
	}

	getDatumKey(datum: CollectionFragmentFragment): string {
		return datum.handle
	}

	deeplyCompareData(sourceData: CollectionFragmentFragment, targetData: CollectionFragmentFragment): boolean {
		// TODO: Currently ignores media
		const strippedSourceData = deeplyStripKeys(sourceData, ["id", "__parentId", "image", "productsCount"])
		const strippedTargetData = deeplyStripKeys(targetData, ["id", "__parentId", "image", "productsCount"])

		return JSON.stringify(strippedSourceData) === JSON.stringify(strippedTargetData)
	}

	async transformCreateData(data: OperationValue<CollectionFragmentFragment>) {
		const isSmartCollection = data.source.ruleSet != null
		if (!isSmartCollection) return null

		logger.debug({
			input: await getSmartCollectionInput(data.source),
		})

		return {
			input: await getSmartCollectionInput(data.source),
		}
	}

	async transformUpdateData(data: OperationValue<CollectionFragmentFragment>) {
		if (data.target == null) return null

		const isSmartCollection = data.source.ruleSet != null
		if (!isSmartCollection) return null

		return {
			input: await getSmartCollectionInput(data.source),
		}
	}
}

export class BulkCustomCollectionMigrator extends BulkMigrator<
	CollectionBulkSimpleFragmentFragment,
	Map<CollectionBulkSimpleFragmentFragment["handle"], CollectionBulkSimpleFragmentFragment>
> {
	targetProductData: Map<SimpleProductIdFragmentFragment["handle"], SimpleProductIdFragmentFragment> = new Map()

	getData(client: Client) {
		return bulkQueryCustomCollection(client, this.options.forceFresh)
	}

	findTargetData(
		sourceData: CollectionBulkSimpleFragmentFragment,
		targetData: CollectionBulkSimpleFragmentFragment[],
	): CollectionBulkSimpleFragmentFragment | undefined {
		return targetData.find(({ handle }) => handle === sourceData.handle)
	}

	getDatumKey(datum: CollectionBulkSimpleFragmentFragment): string {
		return datum.handle
	}

	deeplyCompareData(
		sourceData: CollectionBulkSimpleFragmentFragment,
		targetData: CollectionBulkSimpleFragmentFragment,
	): boolean {
		const keysToStrip = ["id", "__parentId", "image", "products", "productsCount"]
		const strippedSourceData = deeplyStripKeys(sourceData, keysToStrip)
		const strippedTargetData = deeplyStripKeys(targetData, keysToStrip)

		return JSON.stringify(strippedSourceData) === JSON.stringify(strippedTargetData)
	}

	async createData(data: Map<string, OperationValue<CollectionBulkSimpleFragmentFragment>>) {
		logger.info(`Creating ${data.size} ${this.resourceName.plural}`)

		if (this.targetProductData.size === 0) {
			await this.populateTargetProductData()
		}

		const collectionInput = await this.getCollectionInput(data)

		const mutationResource = await createBulkMutationResourceFromData(
			collectionInput,
			`create-${this.resourceName.plural}.jsonl`,
			(data: Input) => data,
		)
		const bulkMutationRunner = new BulkOperationMutationRunner(
			this.resourceName,
			this.createMutation,
			global.targetClient,
		)
		const finishedBulkMutation = await bulkMutationRunner.execute(mutationResource)

		const resource = await FileDownloader.download(
			finishedBulkMutation.url,
			`bulk-${this.resourceName.single}-migrator-create-${this.resourceName.plural}.jsonl`,
		)

		logger.info({ finishedBulkMutation }, `Finished bulk import. You can find it at ${resource.location}`)
	}

	async updateData(data: Map<string, OperationValue<CollectionBulkSimpleFragmentFragment>>) {
		logger.info(`Updating ${data.size} ${this.resourceName.plural}`)

		if (this.targetProductData.size === 0) {
			await this.populateTargetProductData()
		}

		const collectionInput = await this.getCollectionInput(data)

		const mutationResource = await createBulkMutationResourceFromData(
			collectionInput,
			`update-${this.resourceName.plural}.jsonl`,
			(data: Input) => data,
		)
		const bulkMutationRunner = new BulkOperationMutationRunner(
			this.resourceName,
			this.updateMutation,
			global.targetClient,
		)
		const finishedBulkMutation = await bulkMutationRunner.execute(mutationResource)

		const resource = await FileDownloader.download(
			finishedBulkMutation.url,
			`bulk-${this.resourceName.single}-migrator-update-${this.resourceName.plural}.jsonl`,
		)

		logger.info({ finishedBulkMutation }, `Finished bulk import. You can find it at ${resource.location}`)
	}

	private async getCollectionInput(
		data: Map<string, OperationValue<CollectionBulkSimpleFragmentFragment>>,
	): Promise<Map<string, Input>> {
		return Array.from(data.values()).reduce<Map<string, Input>>((acc, collection) => {
			acc.set(collection.source.handle, {
				input: {
					...getCustomCollectionInput(collection.source),
					products: collection.source.products.edges
						.map(({ node }) => {
							const targetProduct = this.targetProductData.get(node.handle)

							if (targetProduct == null) {
								logger.debug({ node, targetProduct }, "Unable to find target product for custom collection")

								return ""
							}

							return targetProduct.id
						})
						.filter(Boolean),
				},
			})

			return acc
		}, new Map())
	}

	private async populateTargetProductData() {
		const bulkQuery = new BulkQuery<
			SimpleProductIdFragmentFragment,
			SimpleProductIdFragmentFragment,
			{
				key: string
				value: SimpleProductIdFragmentFragment
			}
		>(bulkSimpleProductsQuery, global.targetClient, this.resourceName, this.options.forceFresh)
		this.targetProductData = await bulkQuery.run((line: SimpleProductIdFragmentFragment) => {
			return {
				key: line.handle,
				value: line,
			}
		})

		return this.targetProductData
	}

	transformCreateData(
		data: OperationValue<CollectionBulkSimpleFragmentFragment>,
	): object | any[] | Promise<object | any[] | null> | null {
		throw new Error("Method not implemented.")
	}

	transformUpdateData(
		data: OperationValue<CollectionBulkSimpleFragmentFragment>,
	): object | any[] | Promise<object | any[] | null> | null {
		throw new Error("Method not implemented.")
	}
}

export async function bulkQuerySmartCollection(
	client: Client,
	forceFresh = false,
): Promise<Map<string, CollectionFragmentFragment>> {
	const bulkQuery = new BulkQuery<
		CollectionFragmentFragment,
		CollectionFragmentFragment,
		{
			key: string
			value: CollectionFragmentFragment
		}
	>(bulkSmartCollectionsQuery, client, collectionResource, forceFresh)

	return bulkQuery.run(line => {
		return {
			key: line.id,
			value: line,
		}
	})
}

type PossibleQueryLine =
	| CollectionBulkSimpleFragmentFragment
	| WithParentId<CollectionBulkSimpleFragmentFragment["products"]["edges"][number]["node"]>

export async function bulkQueryCustomCollection(client: Client, forceFresh = false) {
	const collectionBulkQuery = new BulkQuery<
		PossibleQueryLine,
		CollectionBulkSimpleFragmentFragment,
		{
			key: string
			value: CollectionBulkSimpleFragmentFragment
		}
	>(bulkCustomCollectionsQuery, client, collectionResource, forceFresh)

	return collectionBulkQuery.run(transformCustomCollectionBulkQueryResultLine)
}

export function transformCustomCollectionBulkQueryResultLine(
	line: PossibleQueryLine,
	data: Map<CollectionBulkSimpleFragmentFragment["id"], CollectionBulkSimpleFragmentFragment>,
): { key: string; value: CollectionBulkSimpleFragmentFragment } {
	switch (line.__typename) {
		case "Collection":
			return {
				key: line.id,
				value: {
					...line,
					products: {
						...line.products,
						edges: [],
					},
				},
			}
		case "Product": {
			const collection = data.get(line.__parentId)
			invariant(collection != null, "Collection not found")

			collection.products.edges.push({ node: line })

			return {
				key: collection.id,
				value: collection,
			}
		}
		default:
			logger.error({ line }, "Unknown line")
			throw new Error("Unknown line")
	}
}
