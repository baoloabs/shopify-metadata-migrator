import invariant from "tiny-invariant"
import {
	AvailablePublicationsDocument,
	CollectionPublicationFragmentFragment,
	PublicationInput,
	PublishablePublishMutationVariables,
} from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { bulkPublishablePublishMutation } from "../../graphql/mutations/bulk-publishable-publish-mutation"
import { bulkCollectionPublicationsQuery } from "../../graphql/queries/bulk-collection-publications-query"
import { collectionResource } from "../../resources/collection/utils"
import { WithParentId } from "../../types"
import { FileDownloader } from "../../utils"
import { createBulkMutationResourceFromData } from "../../utils/bulk-migrator"
import { BulkOperationMutationRunner } from "../../utils/bulk-operation-runner"
import { BulkQuery } from "../../utils/bulk-query"
import { logger } from "../../utils/logger"

type PossibleQueryLine =
	| CollectionPublicationFragmentFragment
	| WithParentId<CollectionPublicationFragmentFragment["resourcePublicationsV2"]["edges"][number]["node"]>

export async function publishCollections() {
	const [sourcePublications, targetPublications] = await Promise.all([
		makeRequest(global.sourceClient, { document: AvailablePublicationsDocument }),
		makeRequest(global.targetClient, { document: AvailablePublicationsDocument }),
	])
	const [sourceData, targetData] = await Promise.all([
		bulkQueryCollectionPublications(global.sourceClient),
		bulkQueryCollectionPublications(global.targetClient),
	])

	const inputData = Array.from(sourceData.values()).reduce<Map<string, PublishablePublishMutationVariables>>(
		(acc, sourceDatum) => {
			const targetDatum = Array.from(targetData.values()).find(({ handle }) => handle === sourceDatum.handle)
			invariant(targetDatum != null, "Target data not found")

			acc.set(targetDatum.id, {
				id: targetDatum.id,
				input: sourceDatum.resourcePublicationsV2.edges
					.map(({ node }) => {
						const targetPublication = targetPublications.publications.nodes.find(
							({ name }) => name === node.publication.name,
						)
						if (!targetPublication) return false

						return {
							publicationId: targetPublication.id,
							publishDate: node.publishDate,
						}
					})
					.filter(Boolean) as PublicationInput[],
			})
			return acc
		},
		new Map(),
	)

	const mutationResource = await createBulkMutationResourceFromData(
		inputData,
		`update-${collectionResource.single}-publications.jsonl`,
		(data: PublishablePublishMutationVariables) => data,
	)
	const bulkMutationRunner = new BulkOperationMutationRunner(
		collectionResource,
		bulkPublishablePublishMutation,
		global.targetClient,
	)
	const finishedBulkMutation = await bulkMutationRunner.execute(mutationResource)

	const resource = await FileDownloader.download(
		finishedBulkMutation.url,
		`bulk-${collectionResource.single}-publish.jsonl`,
	)

	logger.info({ finishedBulkMutation }, `Finished bulk import. You can find it at ${resource.location}`)
}

async function bulkQueryCollectionPublications(
	client: Client,
	forceFresh = false,
): Promise<Map<string, CollectionPublicationFragmentFragment>> {
	const bulkQuery = new BulkQuery<
		PossibleQueryLine,
		CollectionPublicationFragmentFragment,
		{
			key: string
			value: CollectionPublicationFragmentFragment
		}
	>(bulkCollectionPublicationsQuery, client, collectionResource, forceFresh)

	return bulkQuery.run((line, data) => {
		switch (line.__typename) {
			case "Collection":
				return {
					key: line.id,
					value: {
						...line,
						resourcePublicationsV2: {
							...line.resourcePublicationsV2,
							edges: [],
						},
					},
				}
			case "ResourcePublicationV2": {
				const collection = data.get(line.__parentId)
				invariant(collection != null, "Collection not found")

				collection.resourcePublicationsV2.edges.push({ node: line })

				return {
					key: collection.id,
					value: collection,
				}
			}
		}
	})
}
