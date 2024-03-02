import invariant from "tiny-invariant"
import { ProductDeleteAsyncDocument } from "../../generated/graphql"
import { Client, makeRequest } from "../graphql"
import { bulkProductsQuery } from "../graphql/queries/bulk-products-query"
import { BulkOperationQueryLine, WithParentId } from "../types"
import { BulkOperationResultTransformer } from "./bulk-operation-result-transformer"
import { BulkOperationQueryRunner } from "./bulk-operation-runner"
import { FileDownloader } from "./index"
import { logger } from "./logger"

export async function deleteAllProductsOnStore(client: Client) {
	await new ProductDeleter(client).run()
}

export class ProductDeleter {
	bulkQueryRunner: BulkOperationQueryRunner
	client: Client

	constructor(client: Client) {
		this.client = client
		this.bulkQueryRunner = new BulkOperationQueryRunner(
			{
				single: "product",
				plural: "products",
			},
			bulkProductsQuery,
			client,
		)
	}

	async run() {
		const finishedBulkOperation = await this.bulkQueryRunner.execute()
		const targetStoreProducts = await new BulkOperationResultTransformer(
			await FileDownloader.download(finishedBulkOperation.url, "bulk-query-products-delete.jsonl"),
			(line: BulkOperationQueryLine) => {
				if (line.__parentId) {
					return {
						key: line.__parentId,
						value: {
							id: line.__parentId,
						},
					}
				}

				return {
					key: line.id,
					value: { id: line.id },
				}
			},
		).transform()
		const productIds = Array.from(targetStoreProducts.values()).map(({ id }) => id)
		const productIdCount = productIds.length

		for (let i = 0; i < productIdCount; i++) {
			logger.info(`Deleting product ${i + 1} of ${productIdCount}`)

			const productId = productIds[i]
			invariant(productId, `Chunk ${i} is undefined`)

			await makeRequest(this.client, {
				document: ProductDeleteAsyncDocument,
				variables: {
					productId,
				},
			})

			const maximumAvailable = this.client.apiLimits.maximumAvailable
			const currentlyAvailable = this.client.apiLimits.currentlyAvailable
			const restoreRate = this.client.apiLimits.restoreRate

			if (currentlyAvailable <= 100) {
				const amountMissing = maximumAvailable - currentlyAvailable
				const secondsToWait = Math.ceil(amountMissing / restoreRate)

				logger.info(`Waiting ${secondsToWait} seconds for API limits to restore...`)

				await new Promise(resolve => setTimeout(resolve, secondsToWait))
			}
		}
	}
}
