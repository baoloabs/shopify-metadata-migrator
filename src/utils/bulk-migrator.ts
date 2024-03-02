import fs from "fs"
import path from "path"
import { TypedDocumentNode, VariablesOf } from "@graphql-typed-document-node/core"
import { BulkOperationFragmentFragment, Node } from "../../generated/graphql"
import { BulkOperationQueryLine } from "../types"
import { BulkOperationResultTransformer } from "./bulk-operation-result-transformer"
import { BulkOperationMutationRunner, BulkOperationQueryRunner } from "./bulk-operation-runner"
import { FileDownloader, Resource } from "./index"
import { logger } from "./logger"

const BULK_QUERY_FILE_NAME = "bulk-query.jsonl"
const BULK_INPUT_FILE_NAME = "bulk-mutation-input.jsonl"
const BULK_INPUT_RESULT_FILE_NAME = "bulk-mutation-input-result.jsonl"

export type ResourceName = {
	single: string
	plural: string
}

export abstract class SimpleBulkMigrator<
	QueryLine extends BulkOperationQueryLine,
	Fragment extends Node,
	Document = TypedDocumentNode,
> {
	bulkQueryRunner: BulkOperationQueryRunner
	bulkMutationRunner: BulkOperationMutationRunner

	constructor(resourceName: ResourceName, bulkQuery: string, bulkMutation: string) {
		this.bulkQueryRunner = new BulkOperationQueryRunner(resourceName, bulkQuery, global.sourceClient)
		this.bulkMutationRunner = new BulkOperationMutationRunner(resourceName, bulkMutation, global.targetClient)
	}

	async run() {
		const finishedBulkQuery = await this.bulkQueryRunner.execute()
		const data = await this.getBulkQueryResult(finishedBulkQuery, BULK_QUERY_FILE_NAME)
		const inputResource = await this.convertDataToInputFile(data, BULK_INPUT_FILE_NAME)

		const finishedBulkMutation = await this.bulkMutationRunner.execute(inputResource)
		const resource = await FileDownloader.download(finishedBulkMutation.url, BULK_INPUT_RESULT_FILE_NAME)

		logger.info({ finishedBulkMutation }, `Finished bulk import. You can find it at ${resource.location}`)
	}

	async getBulkQueryResult(
		bulkOperation: BulkOperationFragmentFragment,
		fileName: string,
	): Promise<Map<Fragment["id"], Fragment>> {
		return new BulkOperationResultTransformer(
			await FileDownloader.download(bulkOperation.url, fileName),
			this.transformBulkQueryResultJsonLine.bind(this),
		).transform()
	}

	protected async convertDataToInputFile(data: Map<Fragment["id"], Fragment>, outputFilename: string) {
		return createBulkMutationResourceFromData(data, outputFilename, this.transformBulkQueryResultDataToInput.bind(this))
	}

	abstract transformBulkQueryResultDataToInput(bulkOperationItem: Fragment): Promise<VariablesOf<Document> | null>

	abstract transformBulkQueryResultJsonLine(
		line: QueryLine,
		data: Map<Fragment["id"], Fragment>,
	): { key: string; value: Fragment }
}

export type BulkMutationResourceFromDataTransformer<T> = (
	data: T,
) => object | Array<any> | null | Promise<object | Array<any> | null>

export async function createBulkMutationResourceFromData<T, Data extends Map<string, T>>(
	data: Data,
	outputFilename: string,
	dataTransformer: BulkMutationResourceFromDataTransformer<T>,
): Promise<Resource> {
	const destination = path.resolve(global.tmpDirectory, outputFilename)
	logger.info({ destination }, "Writing input file")

	const fileStream = fs.createWriteStream(destination)

	return new Promise(resolve => {
		fileStream.on("open", async () => {
			for (const bulkOperationItem of data.values()) {
				const input = await dataTransformer(bulkOperationItem)
				if (input == null) continue

				if (Array.isArray(input)) {
					for (const line of input) {
						fileStream.write(`${JSON.stringify(line)}\n`)
					}

					continue
				}

				fileStream.write(`${JSON.stringify(input)}\n`)
			}

			fileStream.end(() => {
				return resolve(new Resource(fs.readFileSync(destination), destination))
			})
		})
	})
}
