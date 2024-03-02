import invariant from "tiny-invariant"
import {
	AvailablePublicationsDocument,
	Node,
	ProductPublicationFragmentFragment,
	PublicationInput,
	PublishablePublishMutationVariables,
} from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { bulkPublishablePublishMutation } from "../../graphql/mutations/bulk-publishable-publish-mutation"
import { bulkProductPublicationsQuery } from "../../graphql/queries/bulk-product-publications-query"
import { productResource } from "../../resources/product"
import { WithParentId } from "../../types"
import { FileDownloader } from "../../utils"
import { createBulkMutationResourceFromData } from "../../utils/bulk-migrator"
import { BulkOperationMutationRunner } from "../../utils/bulk-operation-runner"
import { BulkQuery } from "../../utils/bulk-query"
import { logger } from "../../utils/logger"

export async function publishProducts() {
	const [sourcePublications, targetPublications] = await Promise.all([
		makeRequest(global.sourceClient, { document: AvailablePublicationsDocument }),
		makeRequest(global.targetClient, { document: AvailablePublicationsDocument }),
	])
	const [sourceData, targetData] = await Promise.all([
		bulkQueryProductPublications(global.sourceClient),
		bulkQueryProductPublications(global.targetClient),
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
		`update-${productResource.single}-publications.jsonl`,
		(data: PublishablePublishMutationVariables) => data,
	)
	const bulkMutationRunner = new BulkOperationMutationRunner(
		productResource,
		bulkPublishablePublishMutation,
		global.targetClient,
	)
	const finishedBulkMutation = await bulkMutationRunner.execute(mutationResource)

	const resource = await FileDownloader.download(
		finishedBulkMutation.url,
		`bulk-${productResource.single}-publish.jsonl`,
	)

	logger.info({ finishedBulkMutation }, `Finished bulk import. You can find it at ${resource.location}`)
}

type PossibleQueryLine =
	| ProductPublicationFragmentFragment
	| WithParentId<ProductPublicationFragmentFragment["resourcePublicationsV2"]["edges"][number]["node"]>

async function bulkQueryProductPublications(
	client: Client,
	forceFresh = false,
): Promise<Map<string, ProductPublicationFragmentFragment>> {
	const bulkQuery = new BulkQuery<
		PossibleQueryLine,
		ProductPublicationFragmentFragment,
		{
			key: string
			value: ProductPublicationFragmentFragment
		}
	>(bulkProductPublicationsQuery, client, productResource, forceFresh)

	return bulkQuery.run((line, data) => {
		switch (line.__typename) {
			case "Product":
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
				const product = data.get(line.__parentId)
				invariant(product != null, "Product not found")

				product.resourcePublicationsV2.edges.push({ node: line })

				return {
					key: product.id,
					value: product,
				}
			}
		}
	})
}

type NodeWithResourcePublications = Node & {
	handle: string
	resourcePublicationsV2: {
		edges: Array<{
			node: {
				publication: {
					name: string
				}
				publishDate: string
			}
		}>
	}
}
