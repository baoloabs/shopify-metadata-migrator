import invariant from "tiny-invariant"
import {
	BulkMetafieldsSetMutationVariables,
	CollectionMetafieldFragmentFragment,
	MetafieldsSetInput,
} from "../../../generated/graphql"
import { bulkMetafieldsSetMutation } from "../../graphql/mutations/bulk-metafields-set-mutation"
import { bulkCollectionMetafieldsQuery } from "../../graphql/queries/bulk-collection-metafields-query"
import { CollectionBuilder } from "../../resources/collection"
import { collectionResource } from "../../resources/collection/utils"
import { getReferenceValue } from "../../resources/factory"
import { BaseBulkMigratorOptions, WithParentId, baseBulkMigratorOptions } from "../../types"
import { FileDownloader } from "../../utils"
import { createBulkMutationResourceFromData } from "../../utils/bulk-migrator"
import { BulkOperationMutationRunner } from "../../utils/bulk-operation-runner"
import { BulkQuery } from "../../utils/bulk-query"
import { logger } from "../../utils/logger"

export async function migrateCollectionMetafields() {
	return new BulkCollectionMetafieldMigrator().run()
}

type PossibleQueryLine =
	| CollectionMetafieldFragmentFragment
	| WithParentId<CollectionMetafieldFragmentFragment["metafields"]["edges"][number]["node"]>

const MAXIMUM_NUMBER_OF_METAFIELDS_THAN_CAN_BE_SET = 25

class BulkCollectionMetafieldMigrator {
	constructor(private readonly options: BaseBulkMigratorOptions = baseBulkMigratorOptions) {}

	async run() {
		const sourceData = await this.getSourceStoreData()

		const mutationResource = await createBulkMutationResourceFromData(
			sourceData,
			`${collectionResource.single}-metafields-set.jsonl`,
			async (data: CollectionMetafieldFragmentFragment) => await this.getInputData(data),
		)
		const bulkMutationRunner = new BulkOperationMutationRunner(
			collectionResource,
			bulkMetafieldsSetMutation,
			global.targetClient,
		)
		const finishedBulkMutation = await bulkMutationRunner.execute(mutationResource)

		const resource = await FileDownloader.download(
			finishedBulkMutation.url,
			`bulk-${collectionResource.single}-metafield-migrator-metafields-set.jsonl`,
		)

		logger.info({ finishedBulkMutation }, `Finished bulk import. You can find it at ${resource.location}`)
	}

	private async getSourceStoreData() {
		const bulkQuery = new BulkQuery<
			PossibleQueryLine,
			CollectionMetafieldFragmentFragment,
			{
				key: string
				value: CollectionMetafieldFragmentFragment
			}
		>(bulkCollectionMetafieldsQuery, global.sourceClient, collectionResource, this.options.forceFresh)

		return bulkQuery.run((line, data) => {
			switch (line.__typename) {
				case "Collection":
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
					const collection = data.get(line.__parentId)
					invariant(collection != null, "Collection not found")

					collection.metafields.edges.push({ node: line })

					return {
						key: collection.id,
						value: collection,
					}
				}
			}
		})
	}

	private async getInputData(
		sourceData: CollectionMetafieldFragmentFragment,
	): Promise<BulkMetafieldsSetMutationVariables | null> {
		const metafields = sourceData.metafields.edges.map(edge => edge.node)

		if (metafields.length > MAXIMUM_NUMBER_OF_METAFIELDS_THAN_CAN_BE_SET) {
			throw new Error(
				`Collection ${sourceData.handle} has ${metafields.length} metafields, but only ${MAXIMUM_NUMBER_OF_METAFIELDS_THAN_CAN_BE_SET} can be set. We finally need to handle this use case.`,
			)
		}

		if (metafields.length === 0) {
			return null
		}

		const metafieldsSetInput: MetafieldsSetInput[] = []

		for (const metafield of metafields) {
			const [owner, value] = await Promise.all([
				new CollectionBuilder({ identifier: sourceData.handle }).build(),
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

		return { metafields: metafieldsSetInput }
	}
}
